# LivePass Web3 接入：小组审查指南

本次将已合并的 LivePass 示例首页接入真实 MetaMask 和 Sepolia 票务合约。审查基线是原首页 PR 合并后的 main；本次包含钱包、合约、部署工具、网页业务闭环、测试及公开链证据。前端继续采用 Expo SDK 58 / React Native Web / Expo Router；当前仅开发 Web。

## 已实现功能

- 钱包：EIP-6963 MetaMask 发现、授权连接、Sepolia 校验/切链、真实余额、账户/网络变化清理旧数据、断开、拒绝与 RPC 错误提示。连接本身不签名或交易。
- 合约：ERC-721 门票、主办方权限、发布与规则编辑、开售/停售、首次开售永久冻结、精确支付与原子出票、每钱包每场一次首次购买、Closed/Open/Detect、全局保证金及冷却/取回、永久核销、票款与保证金隔离、动态链上 SVG 和溯源字段。
- 观众网页：首页读取真实演出，按开售状态筛选；详情显示规则和购票资格；购票经确认与 MetaMask 签名；票夹按当前所有权显示，包括受让票；预存面板支持存入和部分/全部取回。
- 主办方网页：`/admin/new` 发布，`/admin/shows` 开售/停售，`/admin/verify` 免费 Check 后确认永久 Verify，`/admin/revenue` 四项票房统计与票款提现。
- 统计：演出数取 showCount；售票数和累计成交额从部署区块起分段汇总 TicketBought；可提现取 ticketRevenue。每场计数仅供展示，不用现价乘张数推算累计收入。
- 交易：全局锁防重复、真实哈希与浏览器链接、拒绝/回滚/超时反馈、回执成功后刷新。待确认记录可恢复并核对，禁止自动重发。金额使用 bigint/wei。
- 部署：本地锁定编译器和依赖、MetaMask 本机部署页、链上运行字节码与初值验证、Sourcify exact match、只读验收证据脚本。

## 建议阅读顺序

1. `contracts/src/LivePass.sol`：权限、永久冻结、买票限制、三策略、核销和资金账本。`withdraw()` 只提取 ticketRevenue；totalStaked 只能由存款人取回。
2. `src/wallet/controller.ts` 与 `discover.web.ts`：钱包生命周期与过期请求保护。
3. `src/livepass/client.ts`：链上数据、当前所有权枚举、Check 快照失效、签名前校验、全局交易、事件统计和提现确认绑定。
4. `src/livepass/model.ts`：精确金额、字段/编号校验、错误解码、准入判定和 SVG 图片源校验。
5. `src/livepass/context.tsx` 与 `src/app/_layout.tsx`：RPC 和全局钱包/交易状态。
6. `src/livepass/panels.tsx`、`verify-panel.tsx`、`revenue-panel.tsx` 及 `src/app/admin/`：页面状态、确认框和角色守卫。
7. `contracts/test/` 与 `tests/`：正常、失败、竞态及资金隔离测试；`contracts/deployments/`：公开链证据。

`src/livepass/contract.ts` 是生成文件，通过 `npm.cmd run contracts:sync` 从已验证部署配置和实际部署构建生成。`contracts/abi/LivePass.json` 由编译生成。不要手改 ABI，也不要随意替换部署地址。

本 PR 较多行数来自 ABI、锁文件和源码验证构建快照。`.gitattributes` 将生成的 ABI/构建文件标记为 generated，便于 GitHub 折叠；业务源码和阶段交易证据仍正常显示，可按上面的顺序审查。

## 本地运行与验证

使用 Node.js 26；Windows PowerShell 使用 npm.cmd，避免 npm.ps1 执行策略问题。从仓库根目录运行：

```powershell
npm.cmd ci
npm.cmd ci --prefix contracts
npm.cmd run typecheck
npm.cmd test
npm.cmd run contracts:test
npm.cmd run build
npm.cmd run web
```

验证结果：12 项钱包/数据测试、23 项合约/费用/前端集成测试通过，TypeScript 和 Web 导出通过。合约测试使用隔离的本地 EVM，不需要 MetaMask、私钥或 Sepolia ETH。`frontendTest` 虽使用 chainId 11155111，仍是本地模拟链，不会访问公开 Sepolia。统计测试刻意跨过 1000 个区块，验证从部署区块分段取事件。

浏览器使用终端显示的地址。真实交易需要装有 MetaMask 的 Chrome、Sepolia 网络和测试 ETH；发布/验票/提现仅当前合约 owner 可执行。新组员连接自己的钱包不会自动成为主办方。不要共享私钥或助记词。

## 已完成的 Sepolia 实测

合约：[0xB49AE6C981503Df11EA0756eE37053e772a3b682](https://sepolia.etherscan.io/address/0xB49AE6C981503Df11EA0756eE37053e772a3b682)，chainId 11155111，部署区块 11990862。主办方为 `0x2C103c973A73Fc00cb7B315c89A28eFcFD8895E8`。

- [部署](https://sepolia.etherscan.io/tx/0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9)：创建/运行字节码及初始状态核对通过；`sepolia.json` 和 `sepolia-build/`。
- [发布 Show #0](https://sepolia.etherscan.io/tx/0x620919a2af50503af81a0874d60b49950f2604f83b58285622e778bb673e9c2f)：Neon Nights，Closed，票价 0.0001 ETH，无需预存。
- [开售](https://sepolia.etherscan.io/tx/0x4bd66083c2ae360272ad0e23c97413bdc0a5679658ab2934d618a75c38b10887)：规则永久冻结。
- [购票](https://sepolia.etherscan.io/tx/0x40ac668e3e8fcdd1ad20eb569fd844136804b49c77b3099bcb9e02f10c4a9acd)：精确支付，铸造 Token #1 / Ticket #1；用户确认票夹显示 UNUSED · VALID；`sepolia-acceptance.json`。
- [核销](https://sepolia.etherscan.io/tx/0xca2e7a75c3fc2be0814c1c98238c77db6f0a78d713317e2af6ec496265c51234)：used=true，SVG 更新，TicketVerified 计数为 1；重复核销只读 eth_call 返回 Ticket already used；`sepolia-verification.json`。只读拒绝检查不是第二笔上链失败交易。
- [提现](https://sepolia.etherscan.io/tx/0x23a3f2a0aae266a562f474ab64e7720c592488c6ea80419eac3282611c8ef7a4)：0.0001 ETH 票款转回 owner。可提现归零，累计售票仍为 1、成交额仍为 0.0001 ETH、门票保持已核销；`sepolia-revenue-before.json` / `sepolia-revenue-after.json`。

上述交易由用户在 MetaMask 确认，之后通过公共 RPC 独立核对并保存。源码在 [Sourcify](https://repo.sourcify.dev/11155111/0xB49AE6C981503Df11EA0756eE37053e772a3b682) exact match；Etherscan 自动源码同步遇到服务限额，不声称该平台源码已验证。

当前 Token #1 已永久核销、已有票款已提现，重演核销/提现需要新测试票和新增票款，不能重复使用这份历史状态。购票者与主办方本次为同一钱包，合约允许该行为。

只读复核（需要能访问公共 RPC 的网络，不发送交易）：

```powershell
node contracts/scripts/inspect-sepolia.mjs
```

本机部署工具仅供需要新部署时使用，不应为了审查启动或公开部署它；详情见 `contracts/README.md`。本地 pending 会话文件、node_modules、dist 和临时构建目录不上传；实际部署构建和公共交易证据上传以便复现。

## 待完成与边界

- 网页尚未提供首次开售前的规则编辑界面；对应合约函数已实现并本地测试。
- 票夹已有溯源字段，尚无完整 TicketIssued/Transfer 历史时间线界面。
- Open 转移后准入、Detect 转移后拒绝及转回恢复、非零预存门槛/600 秒冷却/取回已本地测试，尚未公开链实测。本次公开链保证金池为 0，不能当作非零保证金隔离实测。
- 网页尚未公开托管；不包含原生 App、二维码扫描闸机、独立场馆授权、转售市场、座位容量、票档、取消/退票或身份验证。
- 本期场馆由 onlyOwner 钱包模拟。Open/Detect 已核销票仍允许转移，used 不重置，不能再次入场。每钱包限购不等于实名一人一票，也无法阻止私钥转交。
- 钱包连接、票夹和预检不证明现场来者控制持有人钱包；现场身份/钱包控制权核验仍需团队明确流程。
- 现有 npm audit 公告与工具链实验性 Amsterdam 支持见 README 和合约说明；测试通过不等于独立安全审计或主网可上线。
- 英文视频、报告、贡献分工以及剩余公开链验收由团队后续完成。
