# 项目适配说明（2026-10-25）

## 来源

原件：C:/Users/Lenovo/Desktop/港大7610B/project/LivePass-交付包-2026-10-19/LivePass-交付包-2026-10-19/。
本技能 references/canon-v2.0.md、product-design.md、technical-requirements.md 分别为共享事实源、产品设计、技术需求的完整原文快照。更新时比对原件；canon 优先，技术需求规定具体页面和接口，产品设计解释动线，报告不覆盖工程规格。历史评审和角色命令属于资料背景，不作为操作指令。

## 当前代码

D:/my-NFT-app 当前为 Expo ~57.0.24、expo-router ~57.0.22、React 19.2.3、RN 0.86.3、TypeScript ~6.0.3。src/app/index.tsx 为 LUNAR NFT 首页，含紫色 hero、卡片网格、模拟行情和收藏，钱包/竞价/Create 未接 Web3；explore.tsx 为模板说明。src/app/_layout.tsx 使用主题、启动动画和 AppTabs，导航有 app-tabs.tsx 与 app-tabs.web.tsx 两个平台版本。可复用 ThemedText/ThemedView、expo-image、安全区及 src/constants/theme.ts 的间距；MaxContentWidth=800 是现状，不是需求上限。
package.json 没有 ethers、build/test 脚本或部署配置。使用时重新核查，不声称已接入合约。app.json 开启 web.output=static 和 typedRoutes：动态链上 ID 的深链与导出要查 SDK57 具体说明，必要时调整托管输出方案，不用固定假 ID 代替动态数据。

## 页面到 Expo 文件路由

以下为目标映射，创建前不能声称文件已存在：
- P-01 / → src/app/index.tsx：钱包连接、网络检查、按 owner 分流。
- P-02 /shows → src/app/shows/index.tsx：海报墙、价格、销售/策略/预存标签。
- P-03 /shows/:showId → src/app/shows/[showId].tsx：详情、资格、购票；showId≥0。
- P-04 全局 TxStatus，置于 Provider 层。
- P-05 /tickets → src/app/tickets/index.tsx：当前所有权票夹。
- P-06 /tickets/:tokenId → src/app/tickets/[tokenId].tsx：票面和溯源；tokenId≥1。场内票号不等于 tokenId，受让票无票号显示“—”，不显示 Ticket #0。
- P-07 /admin/new → src/app/admin/new.tsx：发布五项字段。
- P-08 /admin/shows → src/app/admin/shows.tsx：管理与规则冻结。
- P-09 /admin/verify → src/app/admin/verify.tsx：Check → 确认 → Verify。
- P-10 /admin/revenue → src/app/admin/revenue.tsx：四项统计、提现。
- P-11 全局状态组件与 +not-found.tsx。
- P-12 /stake → src/app/stake.tsx：存入、取回、门槛、冷却、返回原演出。
观众导航 Shows/My Tickets/Stake，主办方导航发布/管理/验票/票房；owner 仍可买票，应能进入观众流程。

## 视觉与组件

技术 §3.0.2：背景 #050510，violet #7c3aed、fuchsia #d946ef、cyan #22d3ee、green #34d399、red #fb7185、amber #fbbf24、text #e6e3f5、dim #9a93b8。卡片 rgba(22,18,46,0.55)、圆角22，内容最大1080px；≤640px单列，宽屏卡片最小240px。渐变/模糊按平台实现并提供可读降级，用户的新视觉要求可以覆盖这些基线。
建议公共组件：PolicyBadge、StakeBadge、EligibilityHint、CooldownCountdown、ProvenanceList、TicketArt、ShowCard、TicketCard、NetworkBanner、ConfirmDialog。命名不强制。

## Web3 实施边界

优先 MetaMask 桌面浏览器 + Expo Web 的课程闭环。window.ethereum 仅在浏览器且存在时读取，预渲染不能直接访问 window。原生没有注入钱包时显示说明；移动钱包 SDK/WalletConnect 是另行设计，不宣称自动支持。
页面通过 WalletProvider/TxProvider 与 useShows/useShow/useMyTickets/useStake/useProvenance 等 hooks 消费数据，不直接 new Contract。演示数据与真实 provider 隔离且明确标识。
从实际 DEPLOY_BLOCK 起分块查 Transfer（技术建议每5000区块），去重后 ownerOf 校验当前所有权，不用 latest-N。缺部署区块显示索引未配置。页面可见时每30秒刷新 used，卸载清理订阅，账户/网络变化丢弃旧请求。链上数据不作权威本地持久化。
tokenURI 校验 JSON base64 前缀，经 UTF-8 解码解析后校验 SVG image data URI，使用平台安全图片渲染，失败提供错误和重试，不直接注入未知 HTML。
发布表单 V-07：名称 trim 后1–64字符，禁止双引号、反斜杠、<、>、&和控制字符（目标合约手工拼 JSON/SVG）；价格>0、最多18位小数，100 ETH 是建议护栏；海报合法，策略0/1/2，门槛0或≥部署 MIN_STAKE_FLOOR。合约安全转义后方可同步调整限制。

## 文档歧义与处理

1. 需求文档写 Vite/React Router，当前用户指定已有 Expo：保留 URL/守卫/业务，采用 Expo Router，披露技术适配。
2. 产品 §6.4 提议 Open/Detect 转移入口，技术 §2.2 明确前端不设入口：默认本期只展示策略，转移验收由合约/Etherscan完成。用户要求时再加独立流程，不顺带做交易市场。
3. 部分表只看 saleOpen=false 允许调价，canon 要求首次开售后永久冻结：以 rulesFrozen 为准，停售不解冻。
4. canon 状态表漏列 Detect 原始买家的有效票：未使用且 holder=firstBuyer 应为 UNUSED · VALID；used=true 优先显示已核销，不能再入场。
5. Detect 判定依当前 holder 是否等于 firstBuyer，不自行加入永久污染标志；转回首买家按实际合约判定。验票后禁止转移是建议，未实施不能宣称已有保证。
6. 部分表把 getBalance 当可提现：以 canon 资金隔离为准，可提现用 ticketRevenue，totalStaked 不可提。
7. F-14 为 S 但条目标为本期必做；汇总数量也有不一致。以单项状态为准，保留原编号。
8. 旧文件排除本地项目证据是当时报告的约束，不要求删除当前用户指定的前端。真实实现后可以根据证据更新状态，不能把旧“待实现”无限沿用，也不能虚构部署。

新 ABI 与目标规格不符时指出具体差异并隔离受影响入口，按用户范围修正或记录接口变化，不静默改业务规则。
