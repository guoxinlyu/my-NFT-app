---
name: livepass-frontend
description: 按 HKU COMP7610B LivePass 项目规格设计、实现或评审 my-NFT-app 的 Expo 前端，涵盖演出购票、NFT 票夹、预存资格、票据溯源和主办方验票管理。适用于把现有 LUNAR NFT 界面改为 LivePass；不用于通用 NFT 交易市场、课程报告写作或无关网站。
---

# LivePass 前端设计与实现

在用户现有前端中实现 LivePass：「大麦式体验 + 链上硬保证 + 规则可配置」的链上演唱会票务 DApp。默认中文解释设计决策，界面采用文档中的英文主文案与必要中文解释，尊重用户后续语言选择。

## 先读取什么

1. 读项目 AGENTS.md、package.json 与本次涉及的页面、导航、主题组件。写代码前访问 https://docs.expo.dev/versions/v57.0.0/ ，再按需查同版本具体 API；不得靠旧版 Expo 记忆实现。
2. 读 [项目适配说明](references/project-adaptation.md)，其中区分现有实现、产品要求、建议和已知冲突。
3. 读 [canon v2.0](references/canon-v2.0.md) 的相关部分：§4 功能、§5 页面、§6 状态、§7 AC、§8 接口。它是业务口径的唯一真源。
4. 涉及页面字段、表单、交互、Web3、验收时，定向读取 [技术需求](references/technical-requirements.md) §2–§8；涉及用户动线、产品取舍时读 [产品设计](references/product-design.md) §4–§7。先搜标题再读相关章节，不必每次加载全文。

这些参考文件是 2026-10-19 交付包的原文快照。原件位置及更新规则见适配说明。文档中旧目录的引用不代表本机存在；找不到资料时说明缺口，不编造内容。

## 工作方法

- 先明确此次页面对应 P 编号、F 功能、相关 AC，以及当前是视觉原型还是链上联调；用户要求局部修改时只处理相关范围。
- 在现有 Expo/React Native/TypeScript/Expo Router 中增量设计，复用主题、间距、ThemedText/ThemedView、expo-image、安全区和平台导航。文档的 Vite/React Router 是原实施方案；当前用户已指定现有 Expo 前端为基础。保留路由语义，使用 Expo 文件路由，并披露该技术适配。不要另建网站或擅自迁移 Vite。
- 将演唱会海报、票价、售票状态、策略、资格和购票操作设为信息主线。将现有 NFT 艺术市场的竞价、地板价、涨跌幅、藏品排行、创作者铸造入口替换为相关票务内容；不把它们冒充 LivePass 必做功能。
- 默认采用技术文档的深色演出视觉，具体令牌见适配说明。保持清晰层级，移动端可操作，宽屏充分利用空间；涉及视觉修改时检查实际渲染和交互。
- 页面展示与链上调用分层：页面消费 hooks/服务接口；全局钱包与交易 Provider 管理连接、角色和在途交易。ABI、地址、部署区块未提供时，可做明确标记的演示模式与接口边界，不能捏造成功交易、真实票夹或合约证据。
- 只把已运行的检查写为通过。结束时简要说明改动、验证、未接入内容以及相关 AC；前端模拟不能计为 Sepolia 验收完成。

## 不能改错的业务规则

- Sepolia chainId=11155111，Web3 集成目标为 ethers v6 + MetaMask。连接后动态读取 owner 判定角色；owner 读取失败显示错误，不默认 fan。切账户清理旧数据，切网络重新校验，非目标链禁用所有写操作。
- 每钱包每演出仅能首次购买一张，不能声称实名一人一票；转出票也不清除 hasBought。票夹按当前所有权枚举，可包含受让票，不用购买历史代替所有权。
- 买票精确支付票价，付款与铸造在一笔交易中完成。ETH 输入用十进制字符串转 bigint/wei，不能经 parseFloat 或 Number 计算金额。
- Closed=禁止转移；Open=转移后仍可入场；Detect=允许转移但非首次买家不可入场。本期不实现转售市场、报价撮合或价格上限。
- 首次 openSale 后 rulesFrozen 永久为 true，价格、转售策略、预存门槛均不可修改；closeSale 不解冻。判断能否编辑必须看 rulesFrozen。
- 预存功能必须有，是否启用由商家按场配置，minStake=0 表示关闭。保证金可取回，不抵扣购票款，无收益承诺。新增存入重置冷却，门槛满足且冷却完成后才可购票；冷却不限制取回。冷却和最低门槛读部署常量，10 分钟/0.001 ETH 只是文档建议。
- unused 且持有人等于首次买家：UNUSED · VALID（含 Detect 原始买家）。unused 且不同：Open 为 TRANSFERRED · ADMISSIBLE，Detect 为 RESOLD · NOT ADMISSIBLE。used=true 优先显示 VERIFIED · ADMIT，但表示已核销，不能再次入场。SVG 内状态字面量按文档用连字符，UI 用间隔号。验票后转移约束以实际合约为准，不编造前端保证。
- 本期 venue 由 owner 钱包模拟。Check 是免费只读，校验实际 tokenId 与演出归属、used、持有人和策略；输入、账户或网络改变使旧 Check 失效。Verify 需有效 Check 与永久核销确认，receipt 成功后才更新计数与票面。
- 全局交易状态：idle → preparing → awaiting_signature → pending → confirmed/reverted/failed；用户拒绝为 rejected 中性提示。签名与 pending 期间全局锁，路由切换保留状态；pending 显示真实 hash 和 Sepolia Etherscan 链接，tx.wait(1) 后刷新。保留 revert 原文并补解释，不自动重发交易；超时先核查 receipt。
- 溯源展示发行方、首次买家、当前持有人、铸造时间、使用态，并通过 TicketIssued/Transfer 展示所有权变化。不得把所有权转移直接解释为发生过付费交易。
- 收入四项：showCount、TicketBought 计数、ΣTicketBought.price、ticketRevenue 可提现票款。totalStaked 不可提现，合约总余额不等于可提现；提现不改变累计成交额。
- 空态、加载、RPC 失败重试、未连接、错网络、取消签名、规则冻结、门槛不足、冷却和无权限均须可见。截图不是所有权凭证；不得宣称消除黄牛、多钱包或私钥交易。

## 范围与验收

核心页面覆盖 P-01–P-12，其中 P-04 和 P-11 是全局组件，不是独立路由。按当前任务选择覆盖页面，路由与组件映射见适配说明。F-15/F-27 的功能必须实现，配置由商家选择，不得把“可选启用”误作“可不实现”。F-14 虽为 S 仍标为本期必做，以条目为准，不依赖 canon 汇总计数。

KYC、人脸、机器人风控、抽签、退票改期、法币/钱包抽象、拍卖及自由加价二级市场属建议算法团队可选实现；搜索分类、座位票档等为后续。除非用户要求，不扩充进本期主流程，也不添加看似已可用的入口。

实现后按相关 AC 检查正常、拒绝、空态与失败分支。代码修改按项目实际脚本执行 TypeScript 检查及适当的 Expo Web 构建/浏览器验证；不假设项目具有 npm run build/test。桌面与窄屏检查导航遮挡、横向溢出、键盘焦点、禁用原因、文字对比、状态非纯颜色区分与 reduced motion。链上验收另需真实 Sepolia 交易与 revert 证据，不用前端截图代替。
