import { BrowserProvider, ContractFactory, formatEther, getAddress, keccak256 } from '/ethers.js';
import { readDeploymentFees } from '/fees.js';

const $ = id => document.getElementById(id);
const SEPOLIA = '0xaa36a7';
let build, injected, provider, signer, account, prepared, busy = false, revision = 0, submitted = false;
function status(message) { $('status').textContent = message; }
function controls() {
  $('connect').disabled = busy || !build;
  $('switch').disabled = busy || !injected || !account;
  $('ack').disabled = busy || !prepared || submitted;
  $('deploy').disabled = busy || !prepared || !$('ack').checked || submitted;
  $('verify').disabled = busy || !build;
}
function invalidate() {
  ++revision; account = null; signer = null; prepared = null; $('ack').checked = false;
  $('account').textContent = '账户或网络已变化，请重新连接检查'; $('chain').textContent = '待重新检查';
  $('balance').textContent = '—'; $('estimate').textContent = '重新连接后计算'; controls();
}
function errorText(error) {
  if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.info?.error?.code === 4001) return '已取消。未自动重发任何交易。';
  return error.reason ?? error.shortMessage ?? error.message;
}
async function action(callback) {
  if (busy) return;
  busy = true; controls();
  try { await callback(); } catch (error) { status(errorText(error)); }
  finally { busy = false; controls(); }
}
async function post(route, value) {
  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Deploy-Token': build.token }, body: JSON.stringify({ ...value, buildHash: build.buildHash }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
function showRecord(record) {
  submitted = true; $('txhash').value = record.transactionHash;
  status('部署成功，已通过公共 Sepolia RPC 核对字节码、主办方和初始状态，并保存到项目。');
  $('result').replaceChildren();
  for (const [title, value] of [['合约地址', record.address], ['部署交易', record.transactionHash], ['部署区块', String(record.blockNumber)], ['主办方', record.initialOwner]]) {
    const p = document.createElement('p'); p.textContent = `${title}：${value}`; $('result').append(p);
  }
  const a = document.createElement('a'); a.href = record.explorer; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '在 Sepolia Etherscan 查看合约 ↗'; $('result').append(a);
  controls();
}
async function verifyHash(hash) {
  status('正在通过公共 Sepolia RPC 核对交易、运行字节码及主办方…');
  const record = await post('/api/record', { transactionHash: hash.trim() }); showRecord(record);
}
async function discover() {
  let found;
  const listener = event => { if (event.detail?.info?.rdns === 'io.metamask') found = event.detail.provider; };
  window.addEventListener('eip6963:announceProvider', listener);
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise(resolve => setTimeout(resolve, 300));
    return found ?? window.ethereum?.providers?.find(item => item.isMetaMask) ?? (window.ethereum?.isMetaMask ? window.ethereum : null);
  } finally { window.removeEventListener('eip6963:announceProvider', listener); }
}
async function inspect() {
  const current = ++revision;
  prepared = null; $('ack').checked = false;
  const accounts = await injected.request({ method: 'eth_accounts' });
  const chain = await injected.request({ method: 'eth_chainId' });
  if (current !== revision) throw new Error('账户或网络已变化，请重新连接。');
  if (!accounts.length) { invalidate(); throw new Error('请先在 MetaMask 授权账户。'); }
  account = getAddress(accounts[0]); $('account').textContent = account;
  $('chain').textContent = BigInt(chain) === 11155111n ? 'Ethereum Sepolia · 11155111' : `非 Sepolia（${chain}）`;
  if (BigInt(chain) !== 11155111n) { status('请切换到 Ethereum Sepolia 后再部署。'); return; }
  provider?.destroy(); provider = new BrowserProvider(injected, undefined, { cacheTimeout: -1 });
  signer = await provider.getSigner(account);
  const factory = new ContractFactory(build.abi, build.bytecode, signer);
  const request = await factory.getDeployTransaction(account);
  const [gasEstimate, fee, balance] = await Promise.all([signer.estimateGas(request), readDeploymentFees(provider), provider.getBalance(account)]);
  if (current !== revision) throw new Error('账户或网络已变化，请重新连接。');
  const gasLimit = gasEstimate * 120n / 100n;
  $('balance').textContent = `${formatEther(balance)} ETH`;
  $('estimate').textContent = `链上估算 ${gasEstimate} gas；含余量上限 ${gasLimit} gas。\nRPC 即时单价 ${fee.suggestedGasPrice} wei/gas；交易单价上限 ${fee.maxFeePerGas} wei/gas。\n按即时单价估计约 ${formatEther(gasEstimate * fee.suggestedGasPrice)} ETH；本次交易费用上限 ${formatEther(gasLimit * fee.maxFeePerGas)} ETH。报价 2 分钟内有效，钱包确认页仍需核对。`;
  if (balance < gasLimit * fee.maxFeePerGas) throw new Error('Sepolia 测试 ETH 不足以覆盖本次明确的交易费用上限。');
  prepared = { account, revision: current, gasLimit, fee, expiresAt: Date.now() + 120000 };
  status(submitted ? '已存在部署交易，请核对原交易，不要重复部署。' : '检查通过。核对主办方地址后勾选确认，再点击部署。');
}
$('connect').onclick = () => action(async () => {
  if (!injected) {
    injected = await discover();
    if (!injected) throw new Error('未检测到 MetaMask。请在安装了 MetaMask 的 Chrome 打开 http://127.0.0.1:8787/，不要使用 ChatGPT 内置浏览器。');
    injected.on('accountsChanged', invalidate); injected.on('chainChanged', invalidate); injected.on('disconnect', invalidate);
  }
  status('请在 MetaMask 确认连接账户…');
  await injected.request({ method: 'eth_requestAccounts' }); await inspect();
});
$('switch').onclick = () => action(async () => {
  try { await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA }] }); }
  catch (error) {
    if (error.code !== 4902) throw error;
    await injected.request({ method: 'wallet_addEthereumChain', params: [{ chainId: SEPOLIA, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'], blockExplorerUrls: ['https://sepolia.etherscan.io'] }] });
    await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA }] });
  }
  await inspect();
});
$('ack').onchange = controls;
$('deploy').onclick = () => action(async () => {
  if (!prepared || prepared.revision !== revision || !$('ack').checked || submitted) throw new Error('请重新检查钱包和网络。');
  const candidate = prepared;
  if (Date.now() > candidate.expiresAt) {
    await inspect(); throw new Error('报价已过期，已重新读取。请核对新费用并重新勾选确认。');
  }
  const chain = await injected.request({ method: 'eth_chainId' });
  const accounts = await injected.request({ method: 'eth_accounts' });
  if (BigInt(chain) !== 11155111n || !accounts.length || getAddress(accounts[0]) !== candidate.account || candidate.revision !== revision) {
    invalidate(); throw new Error('账户或网络已变化，部署已停止。');
  }
  const state = await (await fetch('/api/status')).json();
  if (state.recorded || state.pending) { submitted = true; throw new Error('已有部署记录或待确认交易，请使用原哈希核对。'); }
  status('请在 MetaMask 核对 Ethereum Sepolia 和部署费用，再确认交易。');
  const contract = await new ContractFactory(build.abi, build.bytecode, signer).deploy(candidate.account, {
    gasLimit: candidate.gasLimit, type: 2,
    maxFeePerGas: candidate.fee.maxFeePerGas, maxPriorityFeePerGas: candidate.fee.maxPriorityFeePerGas,
  });
  const transaction = contract.deploymentTransaction();
  submitted = true;
  $('txhash').value = transaction.hash;
  localStorage.setItem('livepass-sepolia-deployment', transaction.hash);
  status(`交易已广播：${transaction.hash}\n等待链上确认，不要再次部署。`);
  // Persist the hash before awaiting confirmation so refresh cannot trigger a duplicate.
  try { await post('/api/pending', { transactionHash: transaction.hash }); }
  catch (error) { status(`交易已广播：${transaction.hash}\n记录暂未保存：${errorText(error)}。请保留哈希并使用下方核对按钮。`); return; }
  try { await transaction.wait(1, 180000); }
  catch (error) { status(`原交易：${transaction.hash}\n${errorText(error)}\n请核对原交易，页面不会自动重发。`); return; }
  await verifyHash(transaction.hash);
});
$('verify').onclick = () => action(() => verifyHash($('txhash').value));

try {
  const response = await fetch('/api/build'); if (!response.ok) throw new Error('无法加载部署构建。');
  build = await response.json();
  if (keccak256(build.bytecode) !== build.bytecodeHash) throw new Error('构建哈希不一致。');
  $('compiler').textContent = `${build.compiler} · Cancun · optimizer 200 · viaIR`;
  $('hash').textContent = build.bytecodeHash;
  const previous = build.pending?.transactionHash ?? localStorage.getItem('livepass-sepolia-deployment');
  if (build.recorded) showRecord(build.recorded);
  else if (previous) { submitted = true; $('txhash').value = previous; status('检测到已有部署交易。请点击「核对并保存已有部署」，避免重复部署。'); }
  else status('构建加载完成。请连接 MetaMask 读取主办方地址和部署费用。');
  controls();
} catch (error) { status(errorText(error)); }
