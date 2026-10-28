# LivePass

HKU COMP7610 演唱会 NFT 票务 DApp，使用 Expo Web、ethers v6、MetaMask 和 Solidity，目标网络为 Ethereum Sepolia。支持桌面和手机浏览器，业务状态由智能合约维护。

技术栈：Expo SDK 58、React 19、TypeScript、ethers v6、Solidity 0.8.38、OpenZeppelin 5.6.1 和 Hardhat 3.21.0。具体版本以 package/lock 文件为准。

## 本地运行

使用 Node.js 24 或 26。在项目根目录运行；Windows PowerShell 可将 `npm` 换为 `npm.cmd`：

```sh
npm ci
npm ci --prefix contracts
npm run web
```

打开终端显示的地址，使用安装了 MetaMask 的浏览器并连接 Sepolia。连接本身不签名、不产生 gas；执行交易的钱包需有测试 ETH。发布、管理、验票和提现需要链上当前 owner 钱包。

## 主要功能

- 演出发布、开售/停售，以及首次开售前的票价、转售策略和预存门槛编辑；首次开售后规则永久冻结。
- 精确支付与 NFT 出票在同一笔交易完成；每钱包每演出仅能首次购买一次。
- Closed 禁止转移，Open 允许受让票入场，Detect 拒绝非首次买家入场；票夹按当前所有权读取。
- 全局预存、600 秒冷却和部分/全部取回；每秒显示冷却时间，到点核对链上资格，保证金不抵扣票款。
- 免费验票 Check、永久核销 Verify、动态 SVG 票面及完整发行/转移历史。
- 主办方票房统计和票款提现，保证金独立记账；支持交易状态、拒签反馈、待确认及加速/取消交易核对。

连接后默认主办方进入 `/admin/shows`，观众进入 `/shows`；受限页面会先引导连接，再恢复合法目标。演出和门票详情分别使用 `/shows/[showId]`、`/tickets/[tokenId]`。

## 自检与构建预览

```sh
npm run typecheck
npm test
npm run contracts:test
npm run build
npm run preview
```

本地合约测试使用隔离 EVM，不需要 MetaMask 或 Sepolia ETH。构建输出为 `dist/` 中的 SPA；预览默认监听 `http://127.0.0.1:4173`，端口占用时使用 `npm run preview -- 4199`。正式托管需配置页面回退，见[深链托管说明](docs/REVIEW_GUIDE.md#web-构建与深链托管)。

## Sepolia 部署

网页默认配置来自 [sepolia.json](contracts/deployments/sepolia.json)，由 `npm run contracts:sync` 同步，勿手改生成配置。

| 项目 | 默认部署记录 |
|---|---|
| 网络 | Ethereum Sepolia，chainId 11155111 |
| 合约 | [0xB49AE6C981503Df11EA0756eE37053e772a3b682](https://sepolia.etherscan.io/address/0xB49AE6C981503Df11EA0756eE37053e772a3b682) |
| 部署交易 | [0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9](https://sepolia.etherscan.io/tx/0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9) |
| 部署区块 | 11990862 |
| 主办方 | `0x2C103c973A73Fc00cb7B315c89A28eFcFD8895E8`，权限以当前 `owner()` 为准 |

部署、购票、核销和提现证据索引见[审查指南](docs/REVIEW_GUIDE.md#部署与验收证据)。

## 项目文档

| 文档 | 内容 |
|---|---|
| [技术交接与审查指南](docs/REVIEW_GUIDE.md) | 架构、接口、路由、自检及部署证据 |
| [合约说明](contracts/README.md) | 编译、业务约束、部署与源码验证 |
| [完整测试教程](docs/TESTING_GUIDE.md) | 三钱包分工、全流程操作及 AC-01～AC-40 检查表 |
| [协作规范](AGENTS.md) | 项目范围、代码约束和开发要求 |

## 使用边界

仅验收 Web 和 Sepolia 测试网。场馆由 owner 钱包模拟；每钱包限购不等于实名限购，截图不是入场凭证。Open/Detect 已核销票仍可转移，但使用状态不会重置。完整真实钱包验收、正式托管、英文报告和演示视频的进度见审查指南。
