# LivePass 技术交接与审查指南

LivePass 的后端业务由 Solidity 合约承担，Expo Web 页面通过 ethers v6 和 MetaMask 读写合约。本文说明代码入口、接口约束、自检和已保存的验收证据；安装运行见 [README](../README.md)，逐步操作见[测试教程](TESTING_GUIDE.md)。

## 架构与代码入口

| 位置 | 职责 |
|---|---|
| `contracts/src/LivePass.sol` | ERC-721、演出规则、预存、核销、资金隔离和动态 SVG |
| `src/wallet/controller.ts`、`discover.web.ts` | 钱包发现、身份/网络、余额、事件与签名会话 |
| `src/livepass/client.ts`、`model.ts`、`context.tsx` | 合约读写、类型校验、交易、票夹、验票、票房与溯源 |
| `panels.tsx`、`show-rules-editor.tsx` | 购票、预存、演出管理、逐项规则确认与全局交易状态栏 |
| `ticket-card.tsx`、`provenance-panel.tsx` | 票夹/详情共享票面及完整历史展示 |
| `verify-panel.tsx`、`revenue-panel.tsx` | 免费 Check、永久 Verify、票房统计和提现确认 |
| `home-screen.tsx`、`route-access.tsx`、`use-stake-cooldown.ts` | 原首页设计、导航守卫与秒级计时 |
| `src/app/` | Expo 文件路由；根布局直接使用 Slot，钱包和交易状态由全局 Provider 保留 |
| `contracts/scripts/`、`scripts/sync-livepass.mjs` | 编译、部署、核对及生成配置同步 |
| `tests/`、`contracts/test/` | 钱包/模型及本地 EVM 回归测试 |

以上面板路径均位于 `src/livepass/`。按钮、输入框和现有样式统一复用 `ui.tsx`。`src/livepass/contract.ts` 从实际部署记录和构建生成；ABI、地址、部署区块及运行字节码哈希通过 `npm run contracts:sync` 同步。

## Web3 接口

页面通过 `useLivePass()` 消费状态与方法，所有写操作复用统一交易流程。

| 方法 | 参数与约束 |
|---|---|
| `send(action, 'setPrice', [showId, priceWei])` | bigint/wei，价格大于 0，仅 owner、首次开售前 |
| `send(action, 'setResalePolicy', [showId, policy])` | showId 为 bigint，策略 0/1/2，仅 owner、首次开售前 |
| `send(action, 'setStakeRequirement', [showId, minStakeWei])` | bigint/wei，0 关闭，非零至少为链上 MIN_STAKE_FLOOR，仅 owner、首次开售前 |
| `getProvenance(tokenId)` | bigint、≥1，公开只读，不需要签名；返回同一区块的票据、票面和完整历史 |
| `checkPending(replacementHash?)` | 只读核对原交易或加速/取消 hash，确认匹配的链上结果后恢复操作 |

规则编辑按 `rulesFrozen` 判断，停售不解冻。页面每次只确认一项改动；`send` 复查身份、权限、合约预检、gas 和余额，成功回执后刷新，返回 boolean，失败信息取 `shop.tx`。金额始终使用十进制字符串转 bigint/wei。

`getProvenance` 返回 `TicketProvenance`：

- 快照字段包括 tokenId、showId、issuer、firstBuyer、currentHolder、mintedAt、used、policy、status 和 blockNumber；`ticket` 包含真实名称、票号、安全 SVG 图片源及 Ticket 字段。
- `history` 含 TicketIssued/Transfer、区块、日志编号、交易 hash 和 Unix 秒时间。从实际部署区块开始每段最多 1000 区块，按区块/日志顺序返回；失败不返回部分历史。发行关系不表示发行方曾持有 NFT，所有权转移也不证明付费交易。

## 状态与交易约束

- 当前所有权票夹使用 Transfer 候选加 ownerOf 校验；首次购买历史不因转出而清除。票房累计张数和成交额分别按 TicketBought 计数和成交价求和，可提现仅为 ticketRevenue。
- 同身份后台刷新保留规则草稿和票夹展开状态；实际身份或链上规则改变后旧确认失效。普通余额刷新不清空身份，真实账户/网络变化仍使旧签名会话失效。
- 钱包和票务订阅使用稳定的初始 getServerSnapshot。页面保持原有响应式设计，链上 SVG 通过图片源渲染。
- Check 免费，只读展示当前持有人、场次、使用状态和策略；输入、身份或路由改变使预检失效。Verify 经永久核销确认和成功回执后更新，used 永不重置。
- 待确认记录保存 hash、发送者、内容、金额和 nonce；替换核对必须匹配网络、发送者和序号。加速、取消、其他操作和回滚分别反馈，未确认或读取失败保留原记录，不自动重发。数据刷新完成前保持锁，旧等待结果不能覆盖恢复结果或下一笔交易。

## 路由与访问守卫

| 路径 | 行为 |
|---|---|
| `/` | 登录入口；成功后优先恢复合法站内 returnTo，否则 owner→管理页、观众→演出列表 |
| `/shows`、`/shows/[showId]` | 原首页设计的演出列表、独立详情及购票 |
| `/tickets`、`/tickets/[tokenId]` | 当前票夹、任意有效门票的真实票面及完整溯源 |
| `/stake` | 预存与取回，从演出进入时保留返回该场的入口 |
| `/admin/new`、`shows`、`verify`、`revenue` | 主办方发布、管理、验票及票房 |
| 未知路径 | 应用内 404；已移除 Expo 示例 `/explore` |

受限页面未连接或错链时返回 `/` 并保留目标。非 owner 访问管理页回 `/shows` 并提示；owner 读取失败显示错误和重试。有效 Sepolia 身份建立前不自动读取合约。刷新网页后需要重新连接，再恢复目标；主办方可主动进入观众页面购票。

冷却以最近链上时间加本地经过时间显示 `mm:ss`，不每秒请求 RPC；到点重读资格，链上未到终点时保持禁购。追加存入重置冷却，取回不受冷却限制，离开页面清理计时。

## Web 构建与深链托管

`web.output=single` 支持部署后继续产生的演出/门票编号，不在构建时枚举链上数据。执行 `npm run build` 后用 `npm run preview` 预览；默认端口 4173，可传 `-- 4199`。预览脚本仅监听本机，只读 dist，提供页面回退；缺失 JS/图片仍为 404。

正式托管先提供 JS/CSS/图片等静态资源，再将页面路径回退至 `/index.html`，例如 Nginx 页面规则 `try_files $uri $uri/ /index.html;`。未知页面由应用显示 404，SPA 回退本身可能返回 HTTP 200。正式站点需复查地址直达和刷新；当前安装的 Expo serve 静态模式不提供此回退。

## 开发自检

使用 Node.js 24 或 26，命令见 README。清理后开发自检（2026-10-27）：

| 检查 | 结果与范围 |
|---|---|
| TypeScript | 通过；包含干净检出所需 Expo 类型配置 |
| 钱包/模型 | 14 项通过；含同身份刷新保留及实际身份变化失效 |
| 合约/费用/Web3 | 34 项通过；含三项接口集成和八项交易恢复回归 |
| Web 构建 | SPA 导出通过 |
| 浏览器 | 首页、钱包弹窗、受限跳转、Explore/未知页面 404、键盘及 1280px/390px 通过，无资源或运行时错误；未连接时零 RPC |
| 票据详情交易状态 | 提交前补查通过；刷新重连、非法/不存在编号及溯源失败/重试时均保留核对入口，键盘和 390px 通过；核对不发交易 |

接口集成检查还覆盖跨 1000 区块、同块多次转移、核销后转移、固定区块票面、其他票隔离及 RPC 失败。交易恢复检查包括正常确认、刷新恢复、加速/取消、错误 hash/发送者/nonce、未确认、回滚、旧记录与迟到响应。`frontendTest` 是隔离本地 EVM；以上结果不代替真实 MetaMask/Sepolia 验收。

## 部署与验收证据

| 资料 | 地址与状态 |
|---|---|
| [默认部署](../contracts/deployments/sepolia.json) | `0xB49AE6C981503Df11EA0756eE37053e772a3b682`，区块 11990862，网页生成配置指向此实例 |
| [实际部署构建](../contracts/deployments/sepolia-build/) | 保存 ABI、字节码、完整源码依赖和编译设置，供同步及复现 |

默认部署在 2026-10-25 留下以下记录：

| 阶段 | 证据 |
|---|---|
| Closed 演出发布、开售及精确购票 | [sepolia-acceptance.json](../contracts/deployments/sepolia-acceptance.json) |
| Token #1 核销、票面更新及只读重复拒绝 | [sepolia-verification.json](../contracts/deployments/sepolia-verification.json) |
| 提现前后票款归零、累计统计保留 | [before](../contracts/deployments/sepolia-revenue-before.json)、[after](../contracts/deployments/sepolia-revenue-after.json) |

原 Show #0 已冻结、Token #1 已永久核销、历史票款已提现；重演成功流程需使用新数据。该次保证金池为零，不能当作非零保证金隔离实测。原部署 [Sourcify 记录](../contracts/deployments/sourcify-result.json) 为 exact match；不声称 Etherscan 已验证源码。

其他测试实例的部署和测试记录需按合约地址单独归档；未随仓库提供的资料不计入本页已保存的验收证据。后续补证时不能混用实例或覆盖原历史记录。

只读复核运行 `node contracts/scripts/inspect-sepolia.mjs`。新部署与源码验证步骤见[合约说明](../contracts/README.md)，完整真实钱包流程见[测试教程](TESTING_GUIDE.md)。实际部署构建、验收 JSON 和截图均应保留。

## 当前交付边界

完整真实钱包回归需补齐规则编辑、Open/Detect 转移准入、非零预存/冷却/取回及保证金提现隔离等相应证据。正式托管后的深链验收、英文报告和演示视频仍需团队完成。

本期仅 Web/Sepolia，由 owner 模拟场馆；不含独立闸机身份核验、退款改期、座位票档或二级市场。每钱包限购无法解决多钱包或私钥转交，截图不能证明持有人钱包控制权。依赖和工具链边界见合约说明。
