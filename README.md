# LivePass — Concert ticketing frontend

LivePass 是基于 Expo / React Native Web 的演唱会票务网页前端，使用 Expo SDK 58。当前仅开发和验收 Web 版，不再开发 Expo Go、iOS 或 Android 原生 App；保留手机浏览器的响应式布局。

小组成员请先阅读 [本次改动与审查指南](docs/REVIEW_GUIDE.md)：包含已实现功能、代码阅读顺序、复现命令、Sepolia 交易证据及待完成事项。

## 本次改动

### LivePass 首页

- 使用深色舞台背景、紫色品牌、精选演出主视觉和响应式海报卡片，替换 NFT 竞价、藏品榜单、地板价和创作者铸造内容。
- 演出来自已部署的 Sepolia 合约；展示 ETH 票价、Closed / Open / Detect 转售策略、开售状态和预存要求。空合约显示真实空列表。
- “All shows / On sale” 根据链上开售状态筛选；Discover 可滚动至演出区。
- 演出卡片和精选演出支持详情弹窗，展示票价、转售规则、预存说明及当前接入状态。
- 钱包入口提供真实连接与角色状态；演出详情可购票，票夹读取当前所有权，预存面板支持存入、部分或全部取回。
- 手机窄屏改用单列卡片与紧凑导航；图片加载失败时保留背景占位。
- Web 导航使用 Expo Router Slot，由首页自己的响应式导航替换原来覆盖内容的 Expo Starter 浮动标签栏。旧原生模板文件保留，但不属于当前开发和验收范围。

### 数据与能力边界

- `src/livepass/` 提供合约配置、数据与交易控制器及页面组件；`src/data/livepass.ts` 仅保留策略解释，已删除演示数据。
- ABI、地址、部署区块和运行字节码哈希从验证过的部署记录生成：`npm.cmd run contracts:sync`。读取前校验网络和运行字节码。
- 首页和管理页按当前链上 `owner()` 显示权限；每次发送前再次校验账户、网络、权限、资格、gas 与余额。购票用 bigint 精确支付票价，付款和铸票由同一交易完成。
- 主办方可在 `/admin/new` 发布演出，在 `/admin/shows` 开售和停售。首次开售永久冻结规则，界面要求明确确认。测试配置按钮只填表，不自动发送。
- 票夹从部署区块分段查询转入事件，再核对当前 `ownerOf`，包括受让票并排除已转出票；展示链上 SVG 和溯源字段。SVG 通过图片源渲染，不插入 HTML。
- 预存显示全局余额及 600 秒冷却；新增存款重置冷却，取回不受冷却限制，保证金不抵扣票款。
- 页面可见时每 30 秒刷新。切换账户或网络立即清除个人状态；读取失败显示错误并禁用相关操作。合约尚无演出时不会回退到示例卡片。
- 交易状态跨页面保留，签名/待确认期间锁定重复提交。拒绝、回滚和 RPC 错误有独立反馈。sessionStorage 仅保存待确认哈希与交易比对信息；刷新后人工核对原交易，不自动重发。
- `/admin/verify` 提供免费 Check 和需确认的永久 Verify，由主办方 owner 钱包模拟场馆闸机，不存在独立场馆授权角色。预检展示实际演出、持有人、首次买家、使用态、策略、票面及所选场次的链上核销计数。
- 输入、账户、网络或路由变化使旧 Check 失效；异步旧响应被丢弃。发送前重新检查持有人和使用状态，未预检、错场、已核销、Detect 受让票及非主办方均不得发起核销。
- Verify 需要确认不可撤销后进入 MetaMask；回执成功后才刷新票夹、票面和从部署区块分段统计的 TicketVerified 计数。Check 不签名、不产生 gas；读取失败保留错误和重试入口。
- `/admin/revenue` 提供主办方票房统计和票款提现：演出数读取 showCount，总售票数与累计成交额从部署区块分段汇总 TicketBought，当前可提现读取 ticketRevenue。保证金池与合约总余额分别展示，不计入可提现票款。
- 统计采用同一区块快照，页面可见时每 30 秒刷新；事件读取失败显示错误并禁用提现，不使用当前票价乘售票数代替成交额。每场概览展示已售数、当前票价、策略和规则冻结状态。
- 提现确认框显示当前票款与当前 owner 收款地址。签名前复查 owner、账户、网络和可提现金额，数据变化需重新确认；实际执行将提取届时全部票款。交易成功后重读统计，历史售票数和成交额保留，票款余额归零，保证金不动。
- 规则编辑界面尚未实现，对应合约功能已有本地测试。公开链已完成一场 Closed 演出的发布、开售、购票、票夹、验票核销及票款提现验收。
- 海报来自主办方填写的 HTTPS 地址，需要网络；网页票面由合约动态生成。
- 每钱包每场限购不等于实名限购；截图不是入场凭证；仅以 Sepolia 测试网为目标，无真实资金。

### Expo SDK 58 升级

- Expo 升至 `~58.0.19`，React/React DOM 升至 `19.3.0`，React Native 升至 `0.88.0`。
- Router、Expo 模块、Gesture Handler、Reanimated、Worklets、Screens、Safe Area Context、React Native Web 和 React 类型按 Expo 兼容清单对齐；更新 npm 锁文件。
- 原生标签导航导入从 `expo-router/unstable-native-tabs` 改为稳定的 `expo-router/native-tabs`。
- 首页 ScrollView ref 使用组件实例类型，适配新版 React Native；主题选择处理 `null` 并移除旧版 `unspecified` 分支。
- 本机旧依赖备份位于 `.expo/sdk57-upgrade-backup`，属于忽略文件，不上传仓库。

### 项目专用 skill

`.agents/skills/livepass-frontend/` 包含入口规则、调用元数据、需求原文快照与项目适配说明。后续可用 `$livepass-frontend` 指导页面实现与需求核对。

需求快照来自 2026-10-19 交付包；其中 Expo 57 为技能创建时的代码基线。当前实际依赖已升级到 SDK 58，后续开发应核对 `package.json` 与 SDK 58 文档。仓库 AGENTS.md 中原 SDK 57 阅读要求仍保留，升级时同时查阅了 SDK 57、58 和官方迁移说明。

## MetaMask 钱包连接（Web）

已接入 ethers v6，支持电脑 MetaMask 扩展与手机 MetaMask 内置浏览器的注入钱包。点击首页 Connect wallet，再在钱包面板点击连接 MetaMask；在钱包中授权账户后显示真实地址。连接本身不签名、不发交易、不消耗 gas。

- 优先通过 EIP-6963 发现 MetaMask，兼容传统注入接口；没有钱包时显示安装与手机访问说明。
- Sepolia chainId 为11155111（0xaa36a7）；只在 Sepolia 读取并展示测试 ETH 余额，其他网络不展示余额，提供切链提示。
- 支持 wallet_switchEthereumChain；4902 时申请添加 Sepolia 后重新切换，新增网络的公共 RPC 为 ethereum-sepolia-rpc.publicnode.com。
- 监听 accountsChanged / chainChanged / disconnect，立即清除旧身份与余额，并防止过期请求覆盖新状态。切换账户请在 MetaMask 中操作，然后在页面刷新读取。
- 拒绝授权或切链显示中性已取消；已有待处理请求显示提示；RPC 失败可刷新重试。处理期间限制重复请求，可断开本页面连接取消本地等待。
- 断开本页面连接不等于撤销钱包对网站的授权；撤销请在 MetaMask 连接管理中操作。页面不保存私钥、助记词或权威链上数据，也不会在刷新页面时自动弹出授权。
- 仅支持 Web，不计划接入原生钱包 SDK、App 回跳或移动端安装包。手机浏览网页时可使用 MetaMask 内置浏览器。
- 已接入下方 Sepolia 合约。连接钱包后按真实 owner 分流；页面不自动发送交易，所有写入均需明确操作及 MetaMask 确认。

运行钱包生命周期自动检查：

```powershell
node --test tests/wallet.test.mjs
```

钱包测试使用隔离的 EIP-1193 模拟 provider，覆盖读取余额、取消、错链/添加切链、切账户、断开和异步竞态。本地端到端测试使用真实合约和前端控制器，覆盖发布、冻结规则、拒绝/重试、重复点击与购票限制、转出票移除和受让票展示、预存与冷却期取回。这些检查不等于 MetaMask 公开链验收。

## 网页开发与构建

```powershell
npm.cmd ci
npm.cmd start
```

默认启动 Web 开发服务器，在浏览器打开终端显示的地址。PowerShell 使用 `npm.cmd` 可避开 npm.ps1 执行策略限制。钱包联调优先使用安装了 MetaMask 扩展的桌面浏览器，并切换到 Sepolia。

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run contracts:test
npm.cmd run build
```

Web 静态文件输出到 `dist/`。手机浏览器预览可使用 `npm.cmd run web -- --host lan`，在同一 Wi-Fi 下访问电脑的局域网地址；这仍是网页，不需要 Expo Go。网页钱包需支持注入钱包的浏览器。

## LivePass 智能合约（本地）

独立的 `contracts/` 工程实现演出管理、三种转售策略、首次购票限额、预存冷却/取回、验票、资金隔离和链上 SVG 票面。详见 [合约说明](contracts/README.md)。已部署到 Sepolia 并接入网页，部署信息见下文。

```powershell
npm.cmd ci --prefix contracts
npm.cmd run contracts:compile
npm.cmd run contracts:test
```

## 当前 Sepolia 部署

- 合约：[0xB49AE6C981503Df11EA0756eE37053e772a3b682](https://sepolia.etherscan.io/address/0xB49AE6C981503Df11EA0756eE37053e772a3b682)。
- 部署交易：[0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9](https://sepolia.etherscan.io/tx/0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9)。
- 部署区块：11990862；chainId：11155111；owner：`0x2C103c973A73Fc00cb7B315c89A28eFcFD8895E8`。
- 创建/运行字节码和初始状态已核对，记录及完整构建保存在 `contracts/deployments/`。网页显示链上实际状态。2026-10-25 已通过 MetaMask 完成下方发布、开售、购票、验票核销和票款提现验收；公开链转让和预存流程尚未实测。
- [Sourcify 源码验证](https://repo.sourcify.dev/11155111/0xB49AE6C981503Df11EA0756eE37053e772a3b682) 已完成 exact match。Etherscan 自动同步返回共享服务日限额错误，因此不声称 Etherscan 源码已验证。

### Sepolia 网页购票验收（2026-10-25）

- Show #0：Neon Nights，Closed，票价 0.0001 ETH，预存门槛 0，已开售且规则永久冻结。
- [发布交易](https://sepolia.etherscan.io/tx/0x620919a2af50503af81a0874d60b49950f2604f83b58285622e778bb673e9c2f) 与 [开售交易](https://sepolia.etherscan.io/tx/0x4bd66083c2ae360272ad0e23c97413bdc0a5679658ab2934d618a75c38b10887) 回执均成功。
- [购票交易](https://sepolia.etherscan.io/tx/0x40ac668e3e8fcdd1ad20eb569fd844136804b49c77b3099bcb9e02f10c4a9acd) 在区块 11991012 成功，精确支付 0.0001 ETH，原子铸造 Token #1 / Ticket #1。
- 用户已确认网页票夹显示 `UNUSED · VALID`。独立公共 RPC 复核 `ownerOf(1)`、首次买家、发行方均为部署钱包，`hasBought` 为 true，`isUsed` 为 false，tokenURI 含链上 SVG。
- 只读复核脚本：`node contracts/scripts/inspect-sepolia.mjs`。加 `--record` 保存公开链证据到 `contracts/deployments/sepolia-acceptance.json`；脚本不接触私钥、不发送交易。

### Sepolia 验票验收（2026-10-25）

- `/admin/verify` 使用 Show #0、Token #1 免费预检，再经不可撤销确认和 MetaMask 签名执行核销。场馆由同一 owner 钱包模拟。
- [核销交易](https://sepolia.etherscan.io/tx/0xca2e7a75c3fc2be0814c1c98238c77db6f0a78d713317e2af6ec496265c51234) 在区块 11991087 成功，发出 TicketVerified(showId=0, tokenId=1, venue=owner)。
- 用户已确认页面显示 `VERIFIED · ADMIT`、`USED`、`VERIFIED THIS SHOW · 1`，再次核销按钮禁用。独立公共 RPC 确认 used=true、SVG 含 `VERIFIED - ADMIT`、该场核销事件数为 1。
- 使用 owner 作为 from 的重复 `verify(0,1)` **只读 eth_call** 返回 `Ticket already used`。这不是第二笔上链失败交易，不产生 gas。
- 完整证据：[sepolia-verification.json](contracts/deployments/sepolia-verification.json)。可用 `node contracts/scripts/inspect-sepolia.mjs --record-verification` 重建当前状态报告，保留购票阶段原始记录。

## 网页历史验证

### Sepolia 票房与提现验收（2026-10-25）

- 用户在 `/admin/revenue` 核对四项统计后，经页面确认及 MetaMask 签名提现。提现前：演出 1、售票 1、累计成交额 0.0001 ETH、可提现 0.0001 ETH、保证金池 0。
- [提现交易](https://sepolia.etherscan.io/tx/0x23a3f2a0aae266a562f474ab64e7720c592488c6ea80419eac3282611c8ef7a4) 在区块 11991154 成功，Withdrawn 事件确认 0.0001 Sepolia ETH 转给主办方钱包。
- 用户页面与独立公共 RPC 均确认：提现后可提现为 0、合约余额为 0，累计售票仍为 1、累计成交额仍为 0.0001 ETH。Token #1 的所有权和已核销状态保持不变。
- 提现前后记录：[before](contracts/deployments/sepolia-revenue-before.json)、[after](contracts/deployments/sepolia-revenue-after.json)。复核脚本新增 `--record-revenue-before` / `--record-revenue-after`，只读查询并保存证据，不发送交易。
- 本次公开链保证金池为 0；有非零保证金时的资金隔离已通过本地合约和前端集成测试，尚未完成相应公开链场景验收。

当前验票阶段：TypeScript、12 项钱包/数据验证测试、1 项完整前端端到端测试及 Web 静态导出通过。验票阶段新增 uint256 编号和准入规则检查，前端端到端测试使用真实本地 EVM，覆盖免费预检、非 owner、不存在 Token、错场、无 Check、输入不匹配、Check 后转移、拒签重试、重复点击、Open 受让准入、Detect 受让拒绝及转回恢复、已用票拒绝、事件计数、票面更新、RPC 失败恢复和过期响应丢弃。合约本身未改变。

票房阶段：TypeScript、12 项钱包/数据验证测试、23 项合约/费用/前端集成测试及 Web 导出通过。新增票房集成测试在本地 EVM 覆盖空票房、不同票价累计、跨 1000 区块完整索引、保证金与票款隔离、非 owner、零余额、旧确认、拒签、重复点击、真实提现到账（扣 gas）、提现后历史统计保留、另一个标签页提现后的金额变化、RPC 错误恢复、断开后的过期响应与错链。相关 AC：11/13/23/26/28/29。

此前 22 项合约/费用/前端端到端测试通过。冷却边界测试固定到存款区块的第 599/600 秒，避免本地挖矿墙钟漂移。浏览器已确认真实空列表；随后完成上述公开链发布、开售和购票验收。验票相关 AC：07/08/09/20/21/23/27/28/32，模拟测试不代替公开链验收。

- TypeScript：`node node_modules/typescript/bin/tsc --noEmit` 通过。
- Expo 依赖兼容性检查：`npx.cmd expo install --check` 通过（本地兼容映射）。
- Expo Doctor：20/20 检查通过。
- SDK 58 iOS Hermes bundle 与 Web 静态导出：`npx.cmd expo export --platform ios --platform web --clear` 通过。
- 首页浏览器检查：开售筛选 3→2、演出详情、禁用购票状态，以及390px宽度的单列布局通过（首页实现阶段完成）。
- 上述 iOS 打包为历史验证记录；后续仅验收 Web，不再进行原生实机测试或 IPA/APK 构建。
- npm audit 仍报告5项 high 记录，涉及 Expo CLI 的 node-forge、zod 依赖链；未使用会将 Expo 回退到旧主版本的 `npm audit fix --force`。Expo Doctor 通过不等于依赖漏洞审计通过。

## 首页预览

以下为早期界面设计截图；当前演出内容以链上数据为准。

![LivePass homepage](./livepass-home-preview.png)
