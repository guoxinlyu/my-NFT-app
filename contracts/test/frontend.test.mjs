import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BrowserProvider, ContractFactory, keccak256, parseEther } from 'ethers';
import hre from 'hardhat';
import { WalletController } from '../../src/wallet/controller.ts';
import { LivePassClient } from '../../src/livepass/client.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 15));
async function until(condition) {
  for (let i = 0; i < 300; i++) { if (condition()) return; await tick(); }
  assert.fail('Timed out waiting for frontend state');
}

test('frontend publish/buy/stake and Check/Verify: permissions, stale state, rejection, counts and repeat denial', { timeout: 60000 }, async () => {
  const connection = await hre.network.create('frontendTest');
  const rpc = connection.provider;
  const reader = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const accounts = await rpc.request({ method: 'eth_accounts' });
  let account = accounts[0], chain = '0xaa36a7', reject = false, sends = 0;
  const listeners = new Map();
  const injected = {
    on(event, fn) { listeners.set(event, fn); },
    removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
    async request(req) {
      if (req.method === 'eth_accounts' || req.method === 'eth_requestAccounts') return [account];
      if (req.method === 'eth_chainId') return chain;
      if (req.method === 'eth_sendTransaction') { sends++; if (reject) throw { code: 4001, message: 'User rejected' }; }
      return rpc.request(req);
    },
  };
  const wallet = new WalletController(async () => injected);
  let client;
  try {
    const artifact = JSON.parse(readFileSync(new URL('../deployments/sepolia-build/LivePass.json', import.meta.url)));
    const owner = await reader.getSigner(0), fan = await reader.getSigner(1), transferee = await reader.getSigner(2);
    const pass = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(owner.address);
    const receipt = await pass.deploymentTransaction().wait();
    const address = await pass.getAddress();
    client = new LivePassClient(reader, wallet, { chainId: 11155111, address, blockNumber: receipt.blockNumber, runtimeBytecodeHash: keccak256(await reader.getCode(address)) });
    client.start(); await wallet.connect(); await client.load();
    assert.equal(client.getSnapshot().phase, 'ready');
    assert.equal(client.getSnapshot().shows.length, 0); assert.equal(sends, 0);
    const price = parseEther('0.0001');
    assert.equal(await client.send('Publish', 'createShow', ['Web integration', 'https://example.com/a.jpg', price, 1, 0]), true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().shows.length, 1);
    assert.equal(await client.send('Open', 'openSale', [0n]), true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().shows[0].rulesFrozen, true);
    account = fan.address; listeners.get('accountsChanged')?.();
    assert.equal(client.getSnapshot().identity, null);
    await until(() => wallet.getSnapshot().address === fan.address && client.getSnapshot().personalPhase === 'ready');
    const beforeAdmin = sends;
    assert.equal(await client.send('Unauthorized publish', 'createShow', ['Fail', 'https://example.com/a.jpg', price, 0, 0]), false);
    assert.equal(sends, beforeAdmin);
    reject = true;
    assert.equal(await client.send('Rejected buy', 'buy', [0n], price), false);
    assert.equal(client.getSnapshot().tx.stage, 'rejected'); assert.equal(client.isLocked(), false);
    reject = false;
    const buying = client.send('Buy', 'buy', [0n], price);
    assert.equal(await client.send('Duplicate click', 'buy', [0n], price), false);
    assert.equal(await buying, true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().bought['0'], true);
    assert.equal(client.getSnapshot().tickets.length, 1);
    assert.match(client.getSnapshot().tickets[0].image, /^data:image\/svg\+xml;base64,/);
    const beforeRepeat = sends;
    assert.equal(await client.send('Second buy', 'buy', [0n], price), false);
    assert.equal(sends, beforeRepeat); assert.equal(client.getSnapshot().tx.message, 'One ticket per wallet');
    const tokenId = client.getSnapshot().tickets[0].id;
    await (await pass.connect(fan).transferFrom(fan.address, transferee.address, tokenId)).wait();
    await client.load(); assert.equal(client.getSnapshot().tickets.length, 0);
    account = transferee.address; listeners.get('accountsChanged')?.();
    await until(() => client.getSnapshot().identity === transferee.address && client.getSnapshot().personalPhase === 'ready');
    assert.equal(client.getSnapshot().tickets.length, 1);
    assert.equal(client.getSnapshot().tickets[0].ticketNo, null);
    assert.equal(client.getSnapshot().tickets[0].status, 'TRANSFERRED · ADMISSIBLE');
    const deposit = parseEther('0.001');
    assert.equal(await client.send('Stake', 'stake', [], deposit), true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().stake, deposit);
    assert.equal(await client.send('Refund during cooldown', 'unstake', [deposit]), true, client.getSnapshot().tx.message);
    assert.equal(client.getSnapshot().stake, 0n);
    // Door workflow: all Check calls are eth_call/getLogs, never wallet signatures.
    let beforeCheck = sends;
    await client.checkTicket('0', tokenId);
    assert.equal(client.getSnapshot().check.phase, 'error'); // non-owner
    assert.equal(await client.send('Unauthorized verify', 'verify', [0n, BigInt(tokenId)]), false);
    assert.equal(sends, beforeCheck);
    account = owner.address; listeners.get('accountsChanged')?.();
    await until(() => client.getSnapshot().identity === owner.address && client.getSnapshot().personalPhase === 'ready');
    await client.checkTicket('0', '0'); assert.equal(client.getSnapshot().check.phase, 'error');
    await client.checkTicket('0', '999'); assert.match(client.getSnapshot().check.error, /ERC721NonexistentToken/);
    await client.checkTicket('1', tokenId);
    assert.equal(client.getSnapshot().check.result.allowed, false);
    assert.match(client.getSnapshot().check.result.reason, /does not belong/);
    await client.checkTicket('0', tokenId);
    assert.equal(client.getSnapshot().check.result.allowed, true);
    assert.equal(client.getSnapshot().check.result.status, 'TRANSFERRED · ADMISSIBLE');
    assert.equal(client.getSnapshot().check.result.verifiedCount, 0n);
    assert.equal(sends, beforeCheck);
    client.invalidateCheck();
    assert.equal(await client.send('Verify without Check', 'verify', [0n, BigInt(tokenId)]), false);
    await client.checkTicket('0', tokenId);
    assert.equal(await client.send('Different input', 'verify', [1n, BigInt(tokenId)]), false);
    assert.equal(sends, beforeCheck);
    // A transfer after Check must invalidate even an otherwise admissible Open ticket.
    await (await pass.connect(transferee).transferFrom(transferee.address, fan.address, tokenId)).wait();
    assert.equal(await client.send('Stale holder', 'verify', [0n, BigInt(tokenId)]), false);
    assert.match(client.getSnapshot().tx.message, /已改变/); assert.equal(client.getSnapshot().check.phase, 'idle');
    await client.checkTicket('0', tokenId);
    reject = true;
    assert.equal(await client.send('Rejected verify', 'verify', [0n, BigInt(tokenId)]), false);
    assert.equal(client.getSnapshot().tx.stage, 'rejected'); assert.equal(await pass.used(tokenId), false);
    reject = false;
    const verifying = client.send('Verify', 'verify', [0n, BigInt(tokenId)]);
    assert.equal(await client.send('Double verify click', 'verify', [0n, BigInt(tokenId)]), false);
    assert.equal(await verifying, true, client.getSnapshot().tx.message);
    await client.checkTicket('0', tokenId);
    assert.equal(client.getSnapshot().check.result.allowed, false);
    assert.equal(client.getSnapshot().check.result.used, true);
    assert.equal(client.getSnapshot().check.result.verifiedCount, 1n);
    assert.equal(client.getSnapshot().check.result.status, 'VERIFIED · ADMIT');
    beforeCheck = sends;
    assert.equal(await client.send('Used ticket', 'verify', [0n, BigInt(tokenId)]), false);
    assert.equal(sends, beforeCheck);
    // Actual Detect transfer must be refused by the frontend before a signature.
    await (await pass.createShow('Detect test', 'https://example.com/d.jpg', price, 2, 0)).wait();
    await (await pass.openSale(1)).wait();
    await (await pass.connect(fan).buy(1, { value: price })).wait();
    const detectId = (await pass.queryFilter(pass.filters.TicketBought(1)))[0].args.tokenId;
    await (await pass.connect(fan).transferFrom(fan.address, transferee.address, detectId)).wait();
    await client.checkTicket('1', detectId.toString());
    assert.equal(client.getSnapshot().check.result.allowed, false);
    assert.match(client.getSnapshot().check.result.reason, /Resale not permitted/);
    assert.equal(await client.send('Detect resold', 'verify', [1n, detectId]), false); assert.equal(sends, beforeCheck);
    await (await pass.connect(transferee).transferFrom(transferee.address, fan.address, detectId)).wait();
    await client.checkTicket('1', detectId.toString());
    assert.equal(client.getSnapshot().check.result.allowed, true);
    // Late reads cannot resurrect a Check after its input has changed.
    const getCode = reader.getCode.bind(reader); let release;
    reader.getCode = async (...args) => { await new Promise(resolve => { release = resolve; }); return getCode(...args); };
    const lateCheck = client.checkTicket('1', detectId.toString());
    await until(() => !!release); client.invalidateCheck(); release(); await lateCheck;
    assert.equal(client.getSnapshot().check.phase, 'idle');
    reader.getCode = getCode;
    const getBlock = reader.getBlock.bind(reader);
    reader.getBlock = async () => { throw Error('Test RPC unavailable'); };
    await client.checkTicket('0', tokenId); assert.match(client.getSnapshot().check.error, /Test RPC unavailable/);
    reader.getBlock = getBlock;
    await client.checkTicket('0', tokenId); assert.equal(client.getSnapshot().check.phase, 'ready');
    account = fan.address; listeners.get('accountsChanged')?.();
    assert.equal(client.getSnapshot().check.phase, 'idle');
    await until(() => client.getSnapshot().identity === fan.address && client.getSnapshot().personalPhase === 'ready');
    assert.equal(client.getSnapshot().tickets.find(t => t.id === tokenId).status, 'VERIFIED · ADMIT');
    chain = '0x1'; listeners.get('chainChanged')?.();
    assert.equal(client.getSnapshot().identity, null);
    const beforeWrong = sends;
    assert.equal(await client.send('Wrong chain', 'buy', [0n], price), false); assert.equal(sends, beforeWrong);
  } finally { client?.stop(); wallet.dispose(); reader.destroy(); await connection.close(); }
});
