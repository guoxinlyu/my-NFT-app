# LivePass 完整功能验证教程

适用版本：2026-10-27 的 Expo Web、ethers v6 和 LivePass 合约。面向负责测试的同学，也可由开发同学按步骤配合操作。

验证顺序为：固定代码版本 → 本地检查 → 确认部署与钱包 → 准备演出 → 规则编辑 → 预存及购票 → 三策略转移 → 验票 → 溯源 → 资金隔离 → 异常与构建页面 → 汇总 AC 及证据。预存冷却期间可以验证其他演出。

## 1 通过标准与本轮交互重点

同一条功能分别记录本地合约测试、网页操作和 Sepolia 结果。网页禁用按钮只证明前端拦截；只读 `eth_call` 返回 revert 可以证明当时链上合约拒绝该请求，但不是上链失败交易。成功写操作需保留真实交易 hash、成功回执和状态变化。

此前记录的四项交互缺口已补齐，下列项目均需按当前版本重新验收，不沿用旧页面行为：

| 条目 | 当前实现 | 验收处理 |
|---|---|---|
| AC-12 的未连接访问 | 返回 `/`、保留 `returnTo`、自动读取等待 Sepolia 身份 | 直达受限页，核对目标恢复及连接前零合约读取 |
| AC-16 的角色自动路由 | 无目标时 owner→`/admin/shows`、观众→`/shows` | 分别从首页连接 O/A，并验证主办方仍可浏览购票 |
| TC-20 的独立详情深链 | `/shows/:showId`、`/tickets/:tokenId`，沿用现有卡片和表单 | 列表点击、地址直达、刷新重连恢复、后退及非法/不存在编号 |
| TC-12 的秒级冷却倒计时 | 每秒 `mm:ss`，到点重读链上资格 | 检查秒数变化、追加存入重置、到点核对以及未确认时禁购 |

构建使用 SPA，托管端须配置页面路径回退 `index.html`，见[深链托管说明](REVIEW_GUIDE.md#web-构建与深链托管)。AC 来源见 [canon](../.agents/skills/livepass-frontend/references/canon-v2.0.md) 与[技术需求第 7 章](../.agents/skills/livepass-frontend/references/technical-requirements.md)。

## 2 准备版本 环境和三个钱包

先与开发同学约定同一份测试版本，包含新增文件及未提交改动；建议纳入同一提交后记录提交编号。每轮使用独立记录目录，例如 `docs/evidence/run-01/`。本轮先约定其他组员不要在同一合约交叉买票、预存或提现，便于核对增量。

| 角色 | 用途 | 前置条件 |
|---|---|---|
| O | 发布、规则编辑、开售/停售、验票、提现 | 必须等于链上当前 `owner()` |
| A | 首次购票者及预存者 | 优先使用本轮未购过票、预存为零的测试钱包 |
| B | 受让者、第二购票者、无权限及预存不足反例 | 优先使用本轮未购过票、预存为零的测试钱包 |

使用 Node.js 24 或 26、桌面 Chrome 和 MetaMask。将三个钱包切至 **Ethereum Sepolia**，chainId 为 `11155111` / `0xaa36a7`，不要误选其他名称带 Sepolia 的链。看不到该网络时按 [MetaMask 测试网说明](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/) 启用显示测试网络。

各钱包需要测试 ETH 支付自己的 gas；本轮 A 另需 0.002 ETH 预存和 0.0004 ETH 票款，B 需 0.0001 ETH 票款。O 需支付多笔管理交易 gas。实际 gas 费用以钱包报价为准，不给固定总预算。可从 [Ethereum 官方网络页的 Sepolia 水龙头列表](https://ethereum.org/developers/docs/networks/#sepolia)选择可用渠道，领取条件以对应服务当时规则为准。

切账户后在网页钱包面板核对完整地址；若站点仍绑定旧账户，断开本页面连接，在 MetaMask 切换账户并重新连接。不共享私钥或助记词。刷新网页后需重新连接钱包，这是当前行为。

## 3 先运行本地检查

从项目根目录依次运行。Windows PowerShell 使用 `npm.cmd` 替换 `npm`：

```sh
node --version
npm ci
npm ci --prefix contracts
npm run typecheck
npm test
npm run contracts:test
npm run build
npm run web
```

记录命令、实际输出、执行时间和代码版本。当前测试基线与开发自检结果统一见[审查指南](REVIEW_GUIDE.md#开发自检)，本轮数量以实际输出为准。`frontendTest` 是本地模拟链，不能把它的交易当作 Sepolia 证据。

本地测试已覆盖重入、拒收 ETH/NFT、强制 ETH、冷却边界、跨 1000 区块索引及同块多次转移等场景。这些由自动测试检查，不需要在共享公开链上人为部署攻击合约来重演。

网页地址以 `npm run web` 输出为准。后文的 `/admin/shows` 等路径均接在该地址后面。

## 4 确认部署并记录初始状态

先运行已有的只读核对脚本：

```sh
node contracts/scripts/inspect-sepolia.mjs
```

核对 chainId、合约地址、当前 owner、演出、门票及票房。当前部署配置来源是 `contracts/deployments/sepolia.json`；主办方需能操作实际 owner 钱包，拥有公开地址本身不提供管理权限。

记录本轮初始演出数 N0、累计售票 T0、累计成交额 G0、可提现 R0、保证金池 S0 和合约余额。当前 `showCount` 非零是正常的；AC-01 的部署初值 0 要结合部署阶段留档判断，不要求清空共享合约。

旧 Show #0 已冻结，Token #1 已核销，旧票款已提现，不能用它们重演首次编辑、首次核销或有票款提现。后续创建新数据，记录真实编号，不把本文 C/Open/Detect 等代号当成实际 showId。

每个阶段重新运行脚本，把输出另存到本轮目录，例如 `baseline.json`、`revenue-before.json`、`revenue-after.json`。在 Mac/Linux 可先 `mkdir -p docs/evidence/run-01` 再用 `> docs/evidence/run-01/baseline.json` 保存；Windows 保存为 UTF-8。避免使用会覆盖原历史证据的 `--record` 等参数。

该脚本汇总发布、开售、购票、核销、提现及票据状态；**不会列出全部规则编辑、Staked/Unstaked 和发行/转移日志**。这些需另外保存实际交易回执、票夹历史和下面的只读快照。

### 需要全新部署时

现有 owner 不可操作，或需要验证公开链无演出/无收入初态时，可由负责人准备当前代码的独立测试副本。保留原仓库的部署资料，在副本中归档原 `contracts/deployments/` 并新建空目录，使用单独浏览器配置文件及自己可控的 O 钱包。

已有部署工具会拒绝覆盖不同的 `sepolia.json`，且浏览器会恢复旧部署 hash；不能在原目录或原会话里直接重复点击部署来“重置”。副本准备好后：

```sh
npm run contracts:compile
npm run contracts:deploy
```

在有 MetaMask 的 Chrome 打开 `http://127.0.0.1:8787/`，核对 O、Sepolia 和报价，确认部署并等到工具验证、保存成功。随后停止部署工具并运行：

```sh
npm run contracts:sync
npm run web
```

同步的是新部署的真实 ABI、地址、区块及运行字节码哈希。报告和测试记录也需使用这份部署，不混入旧合约的数据。全新部署可先截图无演出、无收入初态；继续用原部署时，这两个公开链 UI 初态应记未执行或另安排测试环境。

## 5 打开只读核对控制台

另开终端，从项目根目录运行 `node`，进入 Node 交互控制台，分段粘贴下列 JavaScript。它只使用公共 RPC 和 `.staticCall`，不读取私钥、不发交易。ethers 的 Provider 合约读取和 staticCall 说明见[官方文档](https://docs.ethers.org/v6/api/contract/)。

```js
var { Contract, JsonRpcProvider, FetchRequest, parseEther, formatEther, keccak256 } = await import('ethers');
var fs = await import('node:fs');
var deployment = JSON.parse(fs.readFileSync('contracts/deployments/sepolia.json', 'utf8'));
var artifact = JSON.parse(fs.readFileSync('contracts/deployments/sepolia-build/LivePass.json', 'utf8'));
var request = new FetchRequest('https://ethereum-sepolia-rpc.publicnode.com');
request.timeout = 20000;
var rpc = new JsonRpcProvider(request, deployment.chainId, { batchMaxCount: 1, cacheTimeout: -1 });
if ((await rpc.getNetwork()).chainId !== 11155111n) throw new Error('Wrong network');
if (keccak256(await rpc.getCode(deployment.address)) !== deployment.runtimeBytecodeHash) throw new Error('Runtime mismatch');
var pass = new Contract(deployment.address, artifact.abi, rpc);
var actors = { O: await pass.owner(), A: '替换为观众A的完整0x地址', B: '替换为观众B的完整0x地址' };
var shows = {};
var tickets = {};
var evidenceDir = 'docs/evidence/run-01';
fs.mkdirSync(evidenceDir, { recursive: true });
function save(label, data) {
  fs.writeFileSync(`${evidenceDir}/${label}.json`, JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', 'utf8');
}
async function expectRevert(label, expected, call) {
  var block = await rpc.getBlockNumber();
  try {
    await call();
    save(label, { mode: 'READ_ONLY_ETH_CALL', address: deployment.address, checkedAt: new Date().toISOString(), observedBlock: block, expected, pass: false, actual: 'Unexpected success' });
    console.log('FAIL', label, 'Unexpected success');
  } catch (error) {
    var actual = error.reason ?? error.revert?.name ?? error.shortMessage ?? error.message;
    var matched = String(actual).includes(expected);
    save(label, { mode: 'READ_ONLY_ETH_CALL', address: deployment.address, checkedAt: new Date().toISOString(), observedBlock: block, expected, actual, pass: matched });
    console.log(matched ? 'PASS' : 'FAIL', label, actual);
  }
}
async function saveTicket(label, tokenId) {
  var block = await rpc.getBlock('latest');
  var at = { blockTag: block.number };
  var p = await pass.provenance(tokenId, at);
  var uri = await pass.tokenURI(tokenId, at);
  var metadata = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
  save(label, { address: deployment.address, tokenId, blockNumber: block.number, blockHash: block.hash,
    issuer: p.issuerAddress, firstBuyer: p.firstBuyer, currentHolder: p.currentHolder,
    mintedAt: p.mintTime, used: p.isUsed, tokenURI: uri, metadata });
  fs.writeFileSync(`${evidenceDir}/${label}.svg`, Buffer.from(metadata.image.split(',')[1], 'base64'));
  console.log(label, metadata.attributes, 'saved at block', block.number);
}
async function saveReceipt(label, hash) {
  var receipt = await rpc.getTransactionReceipt(hash);
  if (!receipt) throw new Error('尚无回执，请稍后核对原交易');
  save(label, receipt.toJSON());
  console.log(label, 'status', receipt.status, 'block', receipt.blockNumber);
}
```

将 A/B 占位符替换为实际地址。后面创建演出和购票后，在这个控制台给 `shows`、`tickets` 填入 **bigint 编号**，例如 `shows.closed = 7n` 这种赋值；7 只是语法示例，必须使用实际编号。保持该控制台开启，退出时调用 `rpc.destroy()` 再输入 `.exit`。

成功交易可用 `await saveReceipt('实际案例名称', '实际交易hash')` 保存回执；每个 label 唯一，避免覆盖同轮证据。反例 helper 中的 `observedBlock` 是调用前观察区块，调用使用最新状态，不把它冒充严格固定区块的快照。

## 6 先检查钱包 权限和空态

1. 未连接钱包打开 `/shows`、`/shows/实际编号`、`/tickets`、`/tickets/实际编号`、`/stake` 及四个管理页，应返回 `/` 并打开连接面板，URL 的 `returnTo` 保留原路径。开发者工具中核对连接前没有合约读取/交易请求；等待一次后台刷新也不应读取。
2. 无 returnTo 时从首页连接 A/B，应自动进入 `/shows` 且没有管理入口；O 应自动进入 `/admin/shows`。O 点击返回演出列表后应能正常浏览和购买，不被反复强制送回控制台。
3. A/B 直达管理页后连接，应返回 `/shows` 并提示非主办方；不能挂载管理表单或发起管理交易。O 在管理页切换为 A，应清除管理内容并返回观众端。
4. A 切到非 Sepolia 网络，确认返回连接入口并提示切链；取消切链后停留、无合约读写，不显示其他网络余额为 Sepolia 测试余额。恢复 Sepolia 后返回原合法目标。
5. 直接打开详情网址，连接后恢复该详情；刷新后需重新连接，再恢复原页。角色读取失败应保留错误和重试，不能猜测为观众或跳错页面。
6. `/shows/abc`、不存在的 showId、`/tickets/0`、不存在的 tokenId 应有明确提示；`/nope` 为页面 404。有效票据详情也可由当前非持有人查询，并明确显示实际持有人。
7. A/B 还没有票时截图票夹空态。无收入/无演出初态依上一节选择的部署环境验证。
8. 连接钱包本身没有交易 hash，也不要求交易签名。核对网页完整地址，避免用错账户继续后续流程。

## 7 创建五场演出并测试规则编辑

O 在 `/admin/new` 创建下列演出。可用现有快捷配置填表，再逐项核对。**Detect 快捷配置默认带预存门槛，本表的 D 要手动改为 0。** 海报使用有效 HTTPS 地址。

| 代号 | 建议名称 | 初始票价 ETH | 策略 | 预存门槛 ETH | 开售安排 |
|---|---|---|---|---|---|
| C | LP Closed run01 | 0.0001 | Closed | 0 | 开售 |
| Open | LP Open run01 | 0.0001 | Open | 0 | 开售 |
| D | LP Detect run01 | 0.0001 | Detect | 0 | 开售 |
| K | LP Stake run01 | 0.0001 | Open | 0.002 | 开售 |
| P | LP Draft run01 | 0.0001 | Closed | 0 | 先不售，编辑后再开售 |

每次保存 ShowCreated 交易和真实 showId，在控制台赋值 `shows.closed`、`shows.open`、`shows.detect`、`shows.stake`、`shows.draft`。表中名字和 ID 没有自动映射关系。

发布前先做不发送交易的表单检查：空名称、超过 64 个字符、包含引号/反斜杠/`< > &` 的名称、非 HTTPS 海报、0 或超过 18 位小数的票价、低于 0.001 ETH 的非零预存门槛都应提示错误。合法中文名称应可接受；提交前确认框显示实际名称、票价、策略及门槛。校验失败不能弹出钱包交易。

在 P 的「编辑开售前规则」依次完成三个独立修改：票价改为 0.0002、策略改为 Open、预存门槛改为 0.001。每项都先看到原值→新值，确认后才弹 MetaMask，成功后刷新。核对对应 PriceUpdated、ResalePolicyUpdated、StakeRequirementUpdated 事件。

同时检查：输入 0 票价、19 位小数、`1e-3` 或低于 0.001 的非零门槛应被拦截；输入改动会取消旧确认。选一项先取消网页确认，再在 MetaMask 拒绝一次，然后重试成功。未变化的值不应产生无意义交易。

P 仍未开售时，在只读控制台验证：

```js
await expectRevert('N01-unsold', 'Sale is not open', () => pass.buy.staticCall(shows.draft, { from: actors.B, value: parseEther('0.0002') }));
```

然后 O 开售 P，再停售 P：编辑入口应一直消失。三项链上拒绝分别验证：

```js
await expectRevert('N02-frozen-price', 'Rules are frozen after sale opens', () => pass.setPrice.staticCall(shows.draft, parseEther('0.0003'), { from: actors.O }));
await expectRevert('N03-frozen-policy', 'Rules are frozen after sale opens', () => pass.setResalePolicy.staticCall(shows.draft, 2, { from: actors.O }));
await expectRevert('N04-frozen-stake', 'Rules are frozen after sale opens', () => pass.setStakeRequirement.staticCall(shows.draft, 0n, { from: actors.O }));
```

P 不购票。C/Open/D/K 按表开售，截图 `saleOpen=true` 和规则冻结说明，确认首页筛选 On sale 排除已停售的 P。

## 8 开始预存并利用冷却时间购票

1. B 尚无预存时，打开 K 详情应提示不足并禁用购买；执行下面的不足反例。
2. A 在 Stake 面板存入 0.002 ETH，记录 stakeOf、stakeSince 和 Staked 事件，立刻验证冷却反例。
3. 冷却期间 A 取回 0.0005 ETH，应立即成功，余额变为 0.0015 ETH，stakeSince 不因部分取回而重置。
4. A 再存入 0.0005 ETH，恢复 0.002 ETH，stakeSince 更新，全部预存冷却从此次重新起算。立刻再验证冷却反例。
5. 等待期间执行下一节 C/Open/D 的购票与转移。暂不取回剩余保证金，后面要验证主办方不能提现它。

```js
await expectRevert('N05-insufficient-stake', 'Insufficient stake', () => pass.buy.staticCall(shows.stake, { from: actors.B, value: parseEther('0.0001') }));
// 在 A 首次存入后、尚未取回时立即执行。
await expectRevert('N06-cooling', 'Stake cooling down', () => pass.buy.staticCall(shows.stake, { from: actors.A, value: parseEther('0.0001') }));
// 在 A 补回 0.0005 ETH 后立即执行。
await expectRevert('N07-cooling-reset', 'Stake cooling down', () => pass.buy.staticCall(shows.stake, { from: actors.A, value: parseEther('0.0001') }));
```

这三条代码分属上面的不同操作时点，不要在还没存入时一次执行。冷却实际已结束时，不能再期待 cooling 反例；应按前置条件重新安排用例。链上冷却秒数读取 `STAKE_COOLDOWN()`；当前为 600 秒。预存页与有门槛的详情页每秒显示 `mm:ss`，追加存入后重置；计时不每秒请求 RPC，到点会重读链上资格。若最新区块尚未到冷却终点，显示核对提示并继续禁购，后续刷新确认后才能购买。从详情进入预存后检查返回原演出的按钮。

## 9 购票和限购

A 分别购买 C、Open、D，各精确支付 0.0001 ETH。每笔观察 preparing → 等待钱包 → pending 的真实 hash → confirmed，回执成功后票夹出现门票；三场 minStake=0，所以 A 正在预存冷却也不应阻止购买。

从票夹或 TicketBought 事件记录实际全局 tokenId，填入 `tickets.closed`、`tickets.openA`、`tickets.detect`。不要用每场 Ticket # 代替 Token #，也不要假定全局编号从本轮的 1 开始。

在 A 的 C 票仍未核销时保存未使用样例：

```js
await saveTicket('ticket-unused-valid', tickets.closed);
await expectRevert('N08-wrong-price-low', 'Send the exact ticket price', () => pass.buy.staticCall(shows.closed, { from: actors.B, value: parseEther('0.00005') }));
await expectRevert('N09-wrong-price-high', 'Send the exact ticket price', () => pass.buy.staticCall(shows.closed, { from: actors.B, value: parseEther('0.0002') }));
await expectRevert('N10-second-purchase', 'One ticket per wallet', () => pass.buy.staticCall(shows.closed, { from: actors.A, value: parseEther('0.0001') }));
```

错误金额使用 **尚未购买 C 的 B**。如果改用已经购买的 A，合约会先返回限购错误，不能拿它证明错误金额检查。核对 `ownerOf`、`hasBought`、买家和 TicketBought.price，余额变化包含 gas，不用钱包余额简单相减推算票价。

## 10 三种策略的转移验证

### 操作 NFT 转移

网页按范围没有“转移门票”按钮。使用 MetaMask：在 NFTs 中选择 Import NFT，网络选择 Ethereum Sepolia，Address 填本轮**合约地址**，Token ID 填实际全局 tokenId；随后选择该 NFT 的 Send，填接收钱包地址并核对后确认。导入 NFT 不会转移所有权；以链上 ownerOf 与回执判断结果。操作参考 [MetaMask 导入说明](https://support.metamask.io/manage-crypto/nfts/nft-tokens-in-your-metamask-wallet/)和[发送说明](https://support.metamask.io/manage-crypto/nfts/how-do-i-send-receive-or-cash-out-an-nft/)。

若钱包不能展示此链上 SVG 门票，可在 [Remix](https://remix.ethereum.org/) 新建 `LivePass.abi`，粘贴实际部署构建中的 ABI 数组，选择 Browser Extension 环境和正确 Sepolia 钱包，通过 Add Contract 加载本轮地址，调用 `transferFrom(from,to,tokenId)`。旧版界面称 At Address。加载已有合约不重新部署，流程见 [Remix 官方说明](https://remix-ide.readthedocs.io/en/latest/run.html#loading-deployed-contracts)。此操作 Value 为 0，不点击 Deploy。

### Closed

A 持有 C 票，验证所有转移入口拒绝；不需要强制广播失败交易：

```js
await expectRevert('N11-closed-transfer', 'Resale not permitted', () => pass.transferFrom.staticCall(actors.A, actors.B, tickets.closed, { from: actors.A }));
await expectRevert('N12-closed-safe-transfer', 'Resale not permitted', () => pass['safeTransferFrom(address,address,uint256)'].staticCall(actors.A, actors.B, tickets.closed, { from: actors.A }));
await expectRevert('N13-closed-safe-transfer-data', 'Resale not permitted', () => pass['safeTransferFrom(address,address,uint256,bytes)'].staticCall(actors.A, actors.B, tickets.closed, '0x', { from: actors.A }));
```

核对 ownerOf 仍是 A，票面没有 TRANSFERRED。授权操作的边界由现有本地测试补充验证。

### Open

1. A 将 `tickets.openA` 转给 B，保存成功 Transfer 回执。
2. A 刷新票夹后该票消失；B 连接并刷新后出现该票，显示受让票号 `—` 和 `TRANSFERRED · ADMISSIBLE`。
3. B 展开完整溯源，核对发行方 O、首次买家 A、当前持有人 B，以及发行、铸造、A→B 转移记录。
4. 执行 `await saveTicket('ticket-open-transferred', tickets.openA)`，在核销前保存可入场的受让状态。
5. B 此时仍没有预存，在 Open 详情首次购买自己的一张票，记录为 `tickets.openB`。B 可同时持有受让票和自己首次购买的票，这不违反首次限购规则；两张 Token # 不同。后续只核销 `openA`，保留 `openB` 未使用。
6. A 再次购买 Open 仍应被限购，证明转出不清除 hasBought：

```js
await expectRevert('N14-repeat-after-transfer', 'One ticket per wallet', () => pass.buy.staticCall(shows.open, { from: actors.A, value: parseEther('0.0001') }));
```

### Detect

1. A 将 `tickets.detect` 转给 B，转移本身成功。
2. B 的票面显示 `RESOLD · NOT ADMISSIBLE`，但 used 仍为 false。
3. O 在 `/admin/verify` 对该票 Check，应该拒绝准入，Verify 禁用；用下面的调用保存合约拒绝原因。
4. 执行 `await saveTicket('ticket-detect-resold', tickets.detect)`，在转回前保存该状态。
5. B 将票转回 A。刷新后恢复 `UNUSED · VALID`，仍未核销，O 的有效 Check 才可以允许 Verify。

```js
// 此条必须在 Detect 票仍由 B 持有且未使用时执行。
await expectRevert('N15-detect-deny', 'Resale not permitted', () => pass.verify.staticCall(shows.detect, tickets.detect, { from: actors.O }));
```

## 11 冷却完成后购买门槛演出

核对 A 的 `stakeSince + STAKE_COOLDOWN` 已不大于最新区块时间。在网页刷新 K 资格后，A 精确支付 0.0001 ETH 购票，记录为 `tickets.stake`。预存余额应仍是 0.002 ETH，票款另付，没有消耗或抵扣保证金。

至此本轮新增五笔购票：A 的 C/Open/D/K 四笔，加 B 的 Open 一笔。所有票价均为 0.0001 ETH，所以新增成交额为 0.0005 ETH。P 的修改后价格为 0.0002 ETH，但本轮不购买 P，不计入成交额。

## 12 免费预检 永久核销与票面状态

先在未核销的 C 票上检查失败分支，再完成正常核销：

1. B 访问验票页应无管理权限。通过只读调用记录非 owner 拒绝。
2. O 输入 Token 0，前端应提示编号非法；输入确认不存在的 Token 时显示读取失败，不把它当作 Show #0 的未使用票。
3. O 输入 `shows.detect` 加 `tickets.closed`，Check 应提示场次不符，Verify 禁用。
4. 对 C 正确 Check，应显示实际持有人、首次买家、策略和状态；没有签名弹窗，也没有 hash 或 gas。
5. 改任一输入后，旧 Check 失效，Verify 禁用；重新正确 Check 才能继续。
6. O 分别核销 C、转到 B 的 `openA`、已转回 A 的 D、A 的 K。每次先 Check，再确认不可撤销，再由 MetaMask 确认，等成功回执后才放行。
7. 每票变成 `VERIFIED · ADMIT` / USED，不能再次入场；每场核销计数按 TicketVerified 增加。Open 本轮卖了两张，但只核销 `openA`，该场本轮核销数应为 1。

页面状态使用中点 `·`，合约 JSON/SVG 使用短横线，例如 `VERIFIED - ADMIT`。核对语义与 used 字段，不把这处格式差别记作状态错误。

```js
await expectRevert('N16-verify-non-owner', 'OwnableUnauthorizedAccount', () => pass.verify.staticCall(shows.closed, tickets.closed, { from: actors.B }));
await expectRevert('N17-wrong-show', 'Ticket does not belong to this show', () => pass.verify.staticCall(shows.detect, tickets.closed, { from: actors.O }));
// 此条放在 C 成功核销以后执行。
await expectRevert('N18-used-again', 'Ticket already used', () => pass.verify.staticCall(shows.closed, tickets.closed, { from: actors.O }));
await saveTicket('ticket-verified', tickets.closed);
```

保留 B 自己购买的 `openB` 未使用，用来对照未使用和已核销状态。可再让 B 把已核销的 `openA` 转回 A：当前 Open/Detect 合约允许核销后转移，但 used 不重置，票面仍是 VERIFIED，再核销依然拒绝。截图必须在各状态被改变之前保存，不能事后从最终票面补画。

## 13 完整溯源的独立核对

在当前持有人票夹中展开“查看完整溯源”，核对发行方、首次买家、当前持有人、快照区块、事件时间和真实交易链接。刷新后结果一致；收起、切换账户或快速重新查询时，旧响应不能覆盖新结果。

网页历史和下面的只读查询结果应能对应。先执行 `saveTicket` 保存票面与来源，再独立取原始事件，例如 Open A 的票：

```js
var endBlock = await rpc.getBlock('latest');
var history = [];
for (var start = deployment.blockNumber; start <= endBlock.number; start += 1000) {
  var end = Math.min(start + 999, endBlock.number);
  history.push(...await pass.queryFilter(pass.filters.TicketIssued(null, tickets.openA), start, end));
  history.push(...await pass.queryFilter(pass.filters.Transfer(null, null, tickets.openA), start, end));
}
history.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
save('open-history', { address: deployment.address, tokenId: tickets.openA, blockNumber: endBlock.number, blockHash: endBlock.hash, logs: history.map(log => log.toJSON()) });
```

TicketIssued 是发行关系记录，不代表发行方曾持有 NFT；零地址→买家才是 ERC-721 铸造 Transfer。转移没有成交价字段，不据此声称发生付费转售。

## 14 带保证金的提现与全部取回

A 暂时保留 0.002 ETH 保证金。O 打开 `/admin/revenue`，保存提现前报告、页面和区块：

| 读数 | 本轮无其他交叉操作时的预期 |
|---|---|
| 演出数 | N0 + 5 |
| 累计售票 | T0 + 5 |
| 累计成交额 | G0 + 0.0005 ETH |
| 当前可提现 | R0 + 0.0005 ETH |
| 保证金池 | S0 + 0.002 ETH |

1. B 无提现入口；直接访问收入页也被权限守卫拦截。
2. O 核对确认框金额和收款地址，执行一次提现，保存 Withdrawn 事件及回执。
3. 提现后 `ticketRevenue=0`，累计售票和成交额不变，保证金池不变，门票所有权/used 不受影响。
4. 正常没有强制转入余额时，合约余额等于保证金池；若有额外 surplus，余额可以更高，不把差额当作主办方可提票款。
5. O 实际到账要扣本笔 gas；如果期间没有其他 O 资金操作，余额增量应等于 Withdrawn.amount 减 receipt.fee。
6. A 在 Stake 面板取回全部余额，记录 Unstaked、余额到账、stakeOf=0、stakeSince=0。已购买票不失效，累计成交额也不改变。
7. 再次刷新票房，正常保证金池回到 S0、可提现仍为 0。零票款提现按钮禁用，超额取回和零金额取回应被阻止。

提现前后分别执行并另存 `inspect-sepolia.mjs` 输出。不要先把 A 的全部保证金退走，再截图声称验证了非零保证金隔离。

提现权限也应留一条合约层证据，在有票款时执行：

```js
await expectRevert('N19-withdraw-non-owner', 'OwnableUnauthorizedAccount', () => pass.withdraw.staticCall({ from: actors.B }));
```

## 15 异常 刷新与正式构建页面

- **拒签和锁**：在尚可操作的规则编辑或首次购票阶段，拒绝一次 MetaMask 交易后重试；确认期间连点不应重复发起交易。签名/广播中切换页面，已有全局交易状态仍应保留。
- **Pending 恢复**：如果实际观察到待确认交易，保存原 hash。切到独立票据详情页，或刷新后重连恢复该页，仍应显示原交易链接、状态及原交易/替换交易核对入口；编号无效、票不存在或读取失败时也应保留。核对原交易状态，不重复提交。若交易太快，不能把未观察到的超时或替换状态填成已实测；相关本地覆盖单独记录。
- **加速/取消后的恢复**：新版本会保存原交易序号。若在 MetaMask 加速或取消后刷新网页，在待确认状态栏填入钱包活动记录中的新 hash，再点击「核对加速 / 取消交易」。同一钱包、同一序号的替换回执确认后才解除锁；加速成功展示新 hash 和已确认，取消展示已取消，其他替换操作不计作原操作成功。输入无关 hash、未确认 hash 或读取失败时仍保留原记录；核对本身不能弹签名。旧版本记录没有序号且原交易已不可读时，应提示无法判定并保持锁，不伪造恢复成功。
- **余额刷新保留表单**：验票页填入 Show/Token，或规则编辑器填写未保存草稿，再刷新同一钱包余额，应保留输入、当前页面和展开状态。正常核销回执成功后保留编号，刷新后的 Check 应显示已使用。切换实际账户或网络仍必须清除旧 Check 与草稿。两类行为分别验收。
- **RPC 错误**：在没有在途交易时，用浏览器开发者工具的 Offline 断网并触发刷新或完整溯源查询；应有错误和重试。恢复 Online 后重试成功。不要把一个第三方图片加载失败等同 RPC 用例。
- **切换账户和网络**：从 A 切 B，旧票夹、余额、角色及 Check 清除；切错链后不能写。恢复 Sepolia 后重新读取。
- **后台刷新**：规则草稿填好后等一次约 30 秒刷新，草稿仍保留；同一钱包的历史展开状态不因普通刷新丢失。实际链上规则改变后旧确认应失效。
- **重建数据**：刷新网页并重新连接钱包，票夹、规则、票房应与链上一致，不依赖旧本地缓存。
- **可访问性和窄屏**：在 1280px 和 390px 检查全部新增表单、完整地址/交易 hash 换行、弹窗滚动、键盘 Tab/Enter、禁用原因和错误提示。状态有文字，不能只有颜色区别。

最后停止开发服务器或另用端口，运行真实构建产物：

```sh
npm run build
npm run preview
```

打开终端实际给出的地址，分别直达 `/admin/shows`、`/tickets`、`/stake`、`/shows/实际编号` 和 `/tickets/实际编号`；未连接时先回首页，连接后应恢复合法目标。再次刷新、重连并核对同一内容；列表→详情→浏览器后退应正常。再检查非法编号、不存在对象和未知页面。正式托管后的路径与刷新还要在真实站点复查，不能用开发服务器的兜底路由替代。

## 16 AC 检查表和证据格式

每项使用 `未执行 / PASS / FAIL / GAP`，另设“执行层”列填写本地、UI、Sepolia 成功交易或只读 eth_call。`GAP` 表示实现或规格差异，不是通过；`FAIL` 表示满足前置条件时实际行为与预期不符。

| AC | 检查内容 | 对应教程 | 初始记录 |
|---|---|---|---|
| 01 | 部署、名称/代号、owner、初值及配置 | 4 | 未执行 |
| 02 | 未开售购票拒绝 | 7 N01 | 未执行 |
| 03 | 开售状态与事件 | 7 | 未执行 |
| 04 | 少付/多付拒绝 | 9 N08/N09 | 未执行 |
| 05 | 精确支付与原子出票 | 9 | 未执行 |
| 06 | 同钱包同场首次限购 | 9 N10、10 N14 | 未执行 |
| 07 | 核销状态与事件 | 12 | 未执行 |
| 08 | 重复核销拒绝 | 12 N18 | 未执行 |
| 09 | 非 owner 核销拒绝 | 12 N16 | 未执行 |
| 10 | 合法 JSON/SVG 与票面字段 | 9/10/12 saveTicket | 未执行 |
| 11 | 提现不动保证金 | 14 | 未执行 |
| 12 | 未连接跳转、目标恢复及零自动合约读取 | 1/6 | 未执行 |
| 13 | 错链及取消切链 | 6/15 | 未执行 |
| 14 | 拒签提示与重试 | 7/9/15 | 未执行 |
| 15 | Pending hash、确认后刷新 | 9/15 | 未执行 |
| 16 | 角色入口、权限及自动跳转 | 1/6 | 未执行 |
| 17 | 演出数和字段一致 | 7/14 | 未执行 |
| 18 | 详情票价、策略与门槛 | 7/8/9 | 未执行 |
| 19 | 转出移除、受让加入票夹 | 10 | 未执行 |
| 20 | Check 只读、持有人与策略 | 10/12 | 未执行 |
| 21 | 核销后票面更新 | 12 | 未执行 |
| 22 | 无票/无演出/无收入空态 | 4/6 | 未执行；无演出需适用环境 |
| 23 | RPC 失败及恢复重试 | 15 | 未执行 |
| 24 | 同钱包跨场购买 | 9/11 | 未执行 |
| 25 | ETH/wei 精度一致 | 7/9、交易回执 | 未执行 |
| 26 | 提现权限 | 6/14 | 未执行 |
| 27 | 原样错误解码与中文说明 | 10/12/15 | 未执行 |
| 28 | 刷新后从链上重建 | 15 | 未执行 |
| 29 | 四项票房与事件统计 | 14 | 未执行 |
| 30 | Closed 拒绝三个转移入口 | 10 N11/N12/N13 | 未执行 |
| 31 | Open 转移后可入场 | 10/12 | 未执行 |
| 32 | Detect 转移后拒绝入场 | 10 N15 | 未执行 |
| 33 | 开售前可编辑、开售后永久冻结 | 7 N02/N03/N04 | 未执行 |
| 34 | 预存不足拒绝 | 8 N05 | 未执行 |
| 35 | 达标冷却后购票和取回 | 8/11/14 | 未执行 |
| 36 | 零门槛无需预存 | 10 B 首购 Open | 未执行 |
| 37 | 冷却及追加存入重置 | 8 N06/N07 | 未执行 |
| 38 | 溯源五字段与日志一致 | 10/13 | 未执行 |
| 39 | 页面/SVG 三地址及公开日志 | 10/13 | 未执行 |
| 40 | 架构、交易、反例及交付证据 | 本节 | 未执行 |

每条记录至少包含：用例编号、代码版本、chainId、合约地址、钱包角色及完整地址、实际 showId/tokenId、前置状态、步骤、预期、实际结果、执行层、时间、区块、证据文件和缺陷编号。成功交易填 hash；只读反例明确填写“无 hash，READ_ONLY_ETH_CALL”；用户拒签与 UI 拦截单独标记，不伪造交易。

本轮最终应能提供：五场创建及开售/停售记录、三项 setter 成功记录、五笔购票、Open/Detect 成功转移、四笔核销、带非零保证金的提现和取回，以及至少四类明确的 revert 证据。这里是项目验收安排，课程硬性要求仍应核对课程原始说明。

四态票面样例要分别保留 `UNUSED · VALID`、`TRANSFERRED · ADMISSIBLE`、`RESOLD · NOT ADMISSIBLE`、`VERIFIED · ADMIT` 的 JSON、SVG 和页面截图。最后把失败项交开发修复，固定新版本后重跑受影响功能及其相邻资金/权限流程，更新 README 证据索引，再进行完整演示彩排。

## 17 交给测试同学的执行顺序

第一轮先完成第 2～7 节，确认钱包、版本、部署和新规则编辑都能操作。第二轮从 A 预存开始，把冷却等待穿插在购票和三策略测试中，再集中完成核销和资金隔离。第三轮做断网、错链、刷新、窄屏及静态构建检查，逐项补齐 AC 证据。

原部署历史证据和本轮新证据分开保存。完整测试结果应如实记录实际失败、规格差异和未执行场景；修复并回归后，才能把相应项目改为 PASS。
