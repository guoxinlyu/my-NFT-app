# Canon v2.0 — 四份文档的共享口径(唯一真源)

> 版本 **v2.0 · 2026-10-19** · Lead 维护,其他角色只读。
> **本版是重构版**(v1.0 已归档到 `00-shared/archive/canon-v1.0-2026-10-18.md`),变更见 §0。
> 任何文档中的 F/P/AC 编号、状态词、合约函数、票面状态、定位表述,必须与本文件一致;冲突以本文件为准。

---

## 0. v2.0 变更摘要(相对 v1.0)

| # | 变更 | 影响 |
|---|---|---|
| 1 | **去掉「本地已有项目」基线**:不再引用任何已部署合约地址、交易哈希、A1–A10 验收记录、v4/v5 版本、本地前端现状、work-log 证据 | 四份文档全部重写相关段落 |
| 2 | **项目重新定位为「为技术团队 P1–P4 从零实现的课程作品做设计与需求」**;课程硬性要求 = **必须满足的实现规格**(不是既成事实) | 01 §1.8、02 §1.4、报告 1.1 |
| 3 | **新增 3 项设计**:①商家可选**转售策略** ②商家可选**预存门槛**(防机器人) ③**票据溯源**(发行方 + 每次钱包变更可查) | 功能/页面/接口/AC/报告全部增补 |
| 4 | **MoSCoW 增「A(建议,算法团队可选实现)」类**:身份/KYC、实名+人脸、自由加价二级市场、拍卖式发售、机器人检测风控、钱包抽象/法币、退票改期等 → 从「明确不做」改为**建议可选** | 01 §4/§8、02 §7、报告 1.2.5 |
| 5 | **状态词废弃 v4/v5**,改为:【本期必做】【本期可选(商家配置)】【建议(算法团队可选)】【后续】 | 全文 |
| 6 | **票面状态机扩为 4 态 S0–S3**(增加「已转手可入场」与「转售不可入场」按策略分支) | 01 §6、02 §4、报告 Fig.2 |
| 7 | **删除 DEF-xx(缺陷)体系** —— 无本地项目即无既存缺陷;改为「实现风险 / 开放问题」 | 01/02 |
| 8 | **报告独立书写结构**:报告是课程提交物,学术化、概括化、逻辑自洽;不得写「为课程目标定制」;定位推导以「调研结果 → 我们想做的产品」为主线,课程要求作为**自然吻合**的一句说明 | 03 EN + 04 ZH |

---

## 1. 项目基线、课程约束与写作纪律(硬性)

### 1.1 项目基线

- 本项目是一个**课程内从零实现的链上演唱会票务 DApp**;本阶段交付**产品设计与技术需求**,由技术团队 P1–P4 实现并部署到 Sepolia。
- **禁止**在任何文档中出现下列内容(已全部作废):
  - 任何已部署合约地址(含 `0xa06c…` 等)、交易哈希、`ownerOf(1)` / `used(1)` 等链上读数作为"本项目成果";
  - A1–A10 验收矩阵、work-log 证据、"v4 已部署 / v5 草稿未部署"等版本叙事;
  - 对本地代码(`dapp_extracted/…`、`LivePass.sol`、`App.jsx`)的"现状"描述;
  - DEF-01…DEF-12 缺陷表(本地项目缺陷)。
- **允许**引用的是:调研事实(`docs/related-works/04`)、课程要求(`COMP7610+Project.pdf`)、学术文献。实现状态一律写「待实现」或「由技术团队实现」。
- 若需说明"为什么某功能不做/暂不做",用**产品理由**(合规、隐私、复杂度、成本、风险)而不是"课程时间不够/老师不要求"。

### 1.2 课程硬性要求(必须满足,写入 01 §1.8 与 02 §1.4)

| # | 要求(来自 COMP7610 项目说明) | 本项目如何满足(规格) |
|---|---|---|
| C-1 | **四层架构**:① 前端(React/Vue/原生 JS)② 智能合约(链上逻辑)③ 区块链库 **Ethers.js** ④ **MetaMask** 钱包 | 前端 React 19 + Vite;合约 Solidity ^0.8.20(OpenZeppelin v5);ethers v6 桥接;MetaMask 账户与签名 |
| C-2 | **至少一次有意义的链上操作**(真实交易/链上状态变更) | 部署 + `createShow` + `openSale` + `buy`(支付并出票)+ `verify`(验票打标)+ `withdraw` 共 ≥6 类交易,且必须覆盖 revert 反例 |
| C-3 | **部署在 Sepolia**(chainId 11155111) | 全部写操作在 Sepolia;前端做网络校验与切链提示 |
| C-4 | 团队 4–5 人、**每人有实质贡献**且报告写贡献分工 | P1 合约 / P2 前端 / P3 Web3 集成 / P4 测试与部署 / P5 产品与报告 |
| C-5 | 演示视频 ≤15 分钟、**英文**、含 live demo | 由团队后续完成(本阶段不交付) |
| C-6 | 项目报告 **英文 PDF**:background / idea / design / implementation / contribution | 本阶段交付第 1 章(1.1 Introduction + 1.2 Related Works),英文 |
| C-7 | 代码仓库:完整可运行源码 + 详细 README | 由技术团队交付;本阶段给出仓库结构与 README 要求 |
| C-8 | 2026-11-08 23:59 截止 | 里程碑 M0–M6(02 §9) |

### 1.3 写作纪律(报告 vs 内部文档)

- **内部文档(01/02)**:中文、工程化、可直接施工;可以写"本期范围/优先级/验收"。
- **报告(03 EN + 04 ZH)**:课程提交物,**独立的学术叙事结构**,不得写成"我们为了满足课程要求而…"。
  - 定位推导以「我们的调研 → 发现的问题 → 我们想做的产品」为主线;
  - 课程要求的满足写成**自然结果**:如 "the design also satisfies the course's four-layer DApp requirement (frontend, smart contract, Ethers.js, MetaMask) on the Sepolia testnet",放在 1.1 末尾或 1.2.7,不进入推导链;
  - 不出现"课程时间有限/老师要求/组内分工"等内部语境于 1.1/1.2;
  - 不声称任何"已部署/已验证"的实现事实(实现章节由团队后补)。

---

## 2. 术语表(中英对照,统一译法)

| 中文 | 英文(报告用) | 说明 |
|---|---|---|
| 主办方 | organizer | 部署并管理演出的钱包 |
| 观众 / 粉丝 | fan | 购票者 |
| 场馆 / 验票方 | venue | 门口验票角色(若由主办方钱包执行,须如实说明) |
| 演出 | show | 一次演唱会/音乐节 |
| 票 / 票面 | ticket | ERC-721 NFT |
| **转售策略** | **resale policy** | 商家按演出配置:**Closed(禁止转售)** / **Open(允许转售)** / **Detect(记录但入场拒绝)** |
| **预存门槛** | **stake requirement / anti-bot stake** | 商家可选:购票前须预先存入合约的最低保证金 |
| **保证金 / 预存额** | stake / deposit | 观众向合约预存的 ETH,可退还 |
| **票据溯源** | **provenance / chain of custody** | 发行方 + 每次钱包变更的链上可查记录 |
| 原子结算 | atomic settlement | 支付与出票在同一笔交易完成 |
| 链上打标 | on-chain stamping | 验票写入 `used[tokenId]` |
| 一人一票(每钱包每演出) | one ticket per wallet per show | 购票上限 |
| 预检(Check) | pre-check | 验票前零 gas 查询 |
| 白标基础设施 | white-label infrastructure | GET/OPEN 等 |
| 行业标配 | table stakes | 票务产品必备功能 |

---

## 3. 产品定位(逐字使用)

**一句话定位(中)**:LivePass 是一个「**大麦式体验 + 链上硬保证 + 规则可配置**」的链上演唱会票务 DApp。
**English**: *LivePass is a Damai-style ticketing experience with hard on-chain guarantees and merchant-configurable rules.*

**三个「不可能」(顺序固定)**:
1. **不可伪造** —— 每张票是 ERC-721,发行方与每次钱包变更都记录在链上(溯源性),截图不携带所有权;
2. **不可囤积** —— 每钱包每场限购一张,且商家可开启**预存门槛**提高机器人与小号成本;
3. **不可二次使用** —— 验票即链上永久打标,重复入场被合约拒绝。

**三条差异化(顺序固定)**:
1. **链上票面状态机** —— 票面 SVG 由合约生成,状态随时变化(未使用/已验/已转手/转售不可入场);
2. **支付+出票原子结算** —— 一笔交易完成付款与 NFT 交割;
3. **商家可配置的链上规则** —— 转售策略(Closed/Open/Detect)与预存门槛按演出配置,规则由合约执行、不可单方篡改。

**诚实边界(必须出现)**:
- 身份层:一人可开多钱包,链上不存身份;KYC/实名+人脸属**建议可选**能力(见 §4 A 类),不作为本项目承诺;
- 资金:Sepolia 测试网,无真实资金;
- 场馆:若实现为 `onlyOwner` 验票,须写入边界(单一管理员钱包模拟闸机);
- 生态:不承诺跨场馆互认;让非合作闸机作废实体票非本设计目标。

---

## 4. 功能注册表 F-xx v2.0(唯一编号来源)

**状态词**:`本期必做` / `本期可选(商家配置)` / `建议(算法团队可选)` / `后续`。**禁止使用 v4/v5。**

| 编号 | 功能 | 角色 | 优先级 | 状态 | 说明 |
|---|---|---|---|---|---|
| F-01 | 发布演出(名称/海报/票价/**转售策略**/**预存门槛**) | 主办方 | M | 本期必做 | 一次 `createShow` 写入五个要素 |
| F-02 | 调整票价 | 主办方 | M | 本期必做 | 开售前可调 |
| F-03 | 开售 / 停售 | 主办方 | M | 本期必做 | 开售后转售策略/预存门槛冻结 |
| F-04 | 票房提现 | 主办方 | M | 本期必做 | 仅 owner,可提取售出票款(不含保证金池) |
| F-05 | 主办方控制台概览(演出/售票/成交额/可提现) | 主办方 | M | 本期必做 | 四块口径见 AC |
| F-06 | 演出海报墙 | 观众 | M | 本期必做 | 列表 + 状态标签(可转售/需预存) |
| F-07 | 演出详情页 | 观众 | M | 本期必做 | 含转售策略与预存要求说明 |
| F-08 | 钱包连接与角色路由 | 全体 | M | 本期必做 | owner→控制台,其他→观众端 |
| F-09 | 购票(原子结算 + 每钱包限购 + 精确票价) | 观众 | M | 本期必做 | `buy()` |
| F-10 | 我的票夹 | 观众 | M | 本期必做 | 票号/状态/溯源链接 |
| F-11 | 链上 SVG 票面(含状态机) | 全体 | M | 本期必做 | `tokenURI()` |
| F-12 | 验票预检 Check(零 gas) | 场馆 | M | 本期必做 | 读所有权/使用态/策略判定 |
| F-13 | 链上验票 Verify(永久打标 + 重复拒绝) | 场馆 | M | 本期必做 | `verify()` |
| F-14 | 验票计数与流程校验 | 场馆 | S | 本期必做 | 计数与错误提示 |
| **F-15** | **商家可选转售策略(Closed / Open / Detect)** | 主办方 | M | 本期必做(功能必做,策略按演出由商家配置) | 见 §6 状态机;策略开售前设定 |
| **F-27** | **预存门槛(防机器人,商家可选)** | 主办方/观众 | M | 本期必做(功能必做,启用与门槛由商家按演出配置) | `stake()`/`unstake()`/`setStakeRequirement()`;0 表示关闭 |
| **F-28** | **票据溯源(发行方 + 钱包变更链)** | 全体 | M | 本期必做 | `issuer(showId)`、`mintHolder(tokenId)`、**`TicketIssued` 事件**(发行时记录 issuer→buyer)、ERC-721 `Transfer` 日志、`provenance(tokenId)` 视图 |
| F-16 | 固定价 / 限价转售市场 | 观众 | S | 后续/建议 | 需托管与撮合,链上可做但成本高 |
| F-17 | 转赠(指定受赠人绑定) | 观众 | C | 后续 | 与 F-15 策略协同 |
| F-19 | 动态防伪码(15–60 秒刷新) | 观众 | C | 后续/建议 | 需服务端签发 |
| F-20 | 抽签/公平分配(Chainlink VRF) | 主办方 | C | 建议(算法团队可选) | 抑制抢购机器人 |
| F-21 | 搜索/分类筛选 | 观众 | C | 后续 | 纯前端 |
| F-22 | 多票档/座位分区 | 主办方 | C | 后续 | 合约结构扩展 |
| F-24 | 赛后出席证明 POA / 纪念徽章 | 观众 | C | 后续 | 复用已验状态 |
| F-25 | 团体票/组队入场 | 观众/场馆 | C | 后续 | 组码核销 |
| **F-18** | **身份层 / KYC** | 系统 | A | **建议(算法团队可选)** | 链上不存 PII;可用可验证凭证 |
| **F-23** | **退票 / 改期** | 观众/主办方 | A | **建议(算法团队可选)** | 需资金流与规则裁决 |
| **F-26** | **钱包抽象 / 法币入金** | 系统 | A | **建议(算法团队可选)** | AA + 支付通道 |
| **F-29** | **拍卖式发售** | 主办方 | A | **建议(算法团队可选)** | 与"反溢价"目标冲突,仅作策略选项 |
| **F-30** | **自由加价二级市场** | 观众/主办方 | A | **建议(算法团队可选)** | 需平台担保/争议处理 |
| **F-31** | **机器人检测与风控** | 系统 | A | **建议(算法团队可选)** | 链下风控 + 链上门槛(F-27)组合 |
| **F-32** | **实名 + 人脸核验** | 场馆 | A | **建议(算法团队可选)** | 合规敏感;与隐私权衡 |

**汇总**:M = F-01…F-15、F-27、F-28(共 17 项);S = F-14、F-16;A(建议可选)= F-18、F-20、F-23、F-26、F-29、F-30、F-31、F-32;C(后续)= F-17、F-19、F-21、F-22、F-24、F-25。

> **A 类表述规范**:必须写「建议算法团队按产品目标可选实现」,并给出价值、风险、依赖与验收建议;不得写成"不做/无法做"。

---

## 5. 页面注册表 P-xx v2.0 + 路由

> 技术团队按目标路由实现(React Router);本阶段只给规格。

| 编号 | 页面 | 角色 | 目标路由 | 关键点 |
|---|---|---|---|---|
| P-01 | 登录 / 钱包连接 | 全体 | `/` | MetaMask 连接、Sepolia 校验、切链提示 |
| P-02 | 观众海报墙 | 观众 | `/shows` | 列表 + 转售策略/预存标签 |
| P-03 | 演出详情页 | 观众 | `/shows/:showId` | 票价、转售策略、预存要求、购票按钮 |
| P-04 | 交易状态浮层 | 全体 | 全局组件 | 签名/待确认/成功/失败/哈希链接 |
| P-05 | 我的票夹 | 观众 | `/tickets` | 票卡 + 状态 + 溯源入口 |
| P-06 | 票面详情 / 入场凭证 | 观众 | `/tickets/:tokenId` | 链上 SVG、状态、溯源、转售策略说明 |
| P-07 | 发布演出 | 主办方 | `/admin/new` | 名称/海报/票价/**转售策略**/**预存门槛** |
| P-08 | 演出管理 | 主办方 | `/admin/shows` | 列表/开售/停售/调价/策略状态 |
| P-09 | 验票面板 | 场馆 | `/admin/verify` | Check(零 gas)+ Verify(打标)+ 策略判定提示 |
| P-10 | 票房与提现 | 主办方 | `/admin/revenue` | 四块口径(演出数/售票数/成交额/可提现) |
| P-11 | 全局状态与提示 | 全体 | 全局 | 空态/错误态/网络提示/交易锁 |
| **P-12** | **预存与购票资格** | 观众 | `/stake` | 预存余额、门槛说明、存入/取回、资格状态 |

---

## 6. 票面状态机与转售策略(唯一口径)

```text
购票成功(立即铸造给买家)
        │
        ▼
S0  UNUSED · VALID  ──verify()──▶  S1  VERIFIED · ADMIT
   (未入场,可入场)                  (已入场,链上永久打标)

按商家转售策略(receipt 前设定):
- Closed(禁止转售):合约阻止任何转移(transferFrom/transfer 一律 revert
  "Resale not permitted"),S0 只属于原始买家;
- Open(允许转售):允许转移,转移后仍为 S0(持有者可入场),票面标注
  "TRANSFERRED · ADMISSIBLE";
- Detect(检测模式,可选):允许转移,但验票时拒绝非原始买家 →
  S2  RESOLD · NOT ADMISSIBLE(仅 Detect 策略可达,入场 revert)。
```

| 状态 | 票面文案 | 判据 | 入场 | 可达策略 |
|---|---|---|---|---|
| S0 | `UNUSED · VALID` | 未验票 | ✅ | Closed / Open |
| S0' | `TRANSFERRED · ADMISSIBLE` | 未验票且当前持有人 ≠ 首次买家 | ✅ | Open |
| S1 | `VERIFIED · ADMIT` | 已验票 | 已入场 | 全部 |
| S2 | `RESOLD · NOT ADMISSIBLE` | 未验票且当前持有人 ≠ 首次买家 | ❌ revert | Detect |

**必须披露的设计边界**:
1. Closed 策略只在合约层阻止转移;链下私下交易(卖出钱包私钥/助记词)无法阻止 —— 这是身份层缺口;
2. Detect 策略是"允许转手但拒绝入场",存在"已验票后再转手"的票面不一致(票面显示 S2 但已入场),需在实现中禁止验票后转移(建议);
3. 策略与预存门槛在**开售后冻结**,避免商家临时改规则影响已购票者;
4. Open/Detect 策略下票价不受约束(限价属 F-16,后续/建议)。

---

## 7. 验收标准 AC-xx v2.0(实现后必须通过)

> 全部为「实现完成后可测试」的标准;测试数据由技术团队在 Sepolia 准备。

| 编号 | 验收标准 | 类型 | 对应功能 |
|---|---|---|---|
| AC-01 | 部署后 `name()`/`symbol()`/`owner()`/`showCount()` 正确;合约地址与部署交易记录进 README | 正例 | F-01 |
| AC-02 | 未开售 `buy()` revert `"Sale is not open"` | 反例 | F-09 |
| AC-03 | `openSale()` 后 `saleOpen == true` 且发出 `SaleToggled` | 正例 | F-03 |
| AC-04 | 支付金额 ≠ 票价 revert `"Send the exact ticket price"` | 反例 | F-09 |
| AC-05 | 正常购票:`ownerOf` = 买家、`hasBought` = true、合约余额 += 票价、发出 `TicketBought` | 正例 | F-09 |
| AC-06 | 同钱包同演出第二次 `buy()` revert `"One ticket per wallet"` | 反例 | F-09 |
| AC-07 | `verify()` 成功:`used[tokenId] = true` 且发出 `TicketVerified` | 正例 | F-13 |
| AC-08 | 二次 `verify()` revert `"Ticket already used"` | 反例 | F-13 |
| AC-09 | 非 owner 调用 `verify()` revert `OwnableUnauthorizedAccount` | 反例 | F-13 |
| AC-10 | `tokenURI()` 解码为合法 JSON + base64 SVG,含演出名/票号/持有人/状态 | 正例 | F-11 |
| AC-11 | `withdraw()` 后**票款**全部转出:`ticketRevenue == 0`、主办方余额增加;若存在保证金池,合约余额 `== totalStaked` 且 `totalStaked` 不变 | 正例 | F-04 |
| AC-12 | 未连接钱包访问受限页面 → 提示连接,不发交易 | 边界 | F-08 |
| AC-13 | 非 Sepolia 网络 → 提示切链;拒绝则停留 | 边界 | F-08 |
| AC-14 | 用户拒绝签名 → 页面不崩溃、提示已取消、按钮恢复 | 异常 | P-04 |
| AC-15 | pending 状态显示哈希;确认后数据刷新 | 状态 | P-04 |
| AC-16 | owner 钱包 → 控制台;其他钱包 → 观众端 | 正例 | F-08 |
| AC-17 | 海报墙渲染 `showCount()` 条演出,字段与链上一致 | 正例 | F-06 |
| AC-18 | 详情页展示票价、转售策略、预存门槛 | 正例 | F-07 |
| AC-19 | 票夹只显示当前钱包持有的票(按所有权枚举,非购买记录) | 正例 | F-10 |
| AC-20 | Check 预检零 gas 返回持有人 + 使用状态 + 策略判定 | 正例 | F-12 |
| AC-21 | 验票后票卡状态由 `UNUSED · VALID` 变 `VERIFIED · ADMIT` | 正例 | F-11/F-13 |
| AC-22 | 空态:无票/无演出/无收入时显示空态与引导 | 空态 | P-11 |
| AC-23 | RPC 失败 → 错误态 + 重试按钮 | 异常 | P-11 |
| AC-24 | 同一钱包可对不同演出各购一票 | 正例 | F-09 |
| AC-25 | 价格展示与链上 wei 一致(`0.01 ETH = 10^16 wei`) | 正例 | F-06 |
| AC-26 | 提现入口仅 owner 可见可点 | 权限 | F-04/F-08 |
| AC-27 | 验票失败时解码 revert reason 并原样显示 | 异常 | F-13 |
| AC-28 | 刷新页面后全部数据从链上重建 | 状态 | F-05/F-10 |
| AC-29 | 概览四块口径:演出数=`showCount`、售票数=`TicketBought` 事件计数、成交额=Σ成交价、可提现=合约可提余额;事件查询须从部署区块分块 | 正例 | F-05 |
| **AC-30** | **Closed 策略**:`transferFrom`/`safeTransferFrom` revert `"Resale not permitted"`;票面不出现 TRANSFERRED | 反例 | F-15 |
| **AC-31** | **Open 策略**:转移成功;票面变 `TRANSFERRED · ADMISSIBLE`;`verify()` 放行 | 正例 | F-15 |
| **AC-32** | **Detect 策略**:转移成功但 `verify()` revert `"Resale not permitted"`;票面 `RESOLD · NOT ADMISSIBLE` | 反例 | F-15 |
| **AC-33** | 策略与预存门槛在开售后不可修改(revert `"Rules are frozen after sale opens"`) | 反例 | F-15/F-27 |
| **AC-34** | **预存门槛开启**:`buy()` 前未达 `minStake` → revert `"Insufficient stake"` | 反例 | F-27 |
| **AC-35** | 预存后 `buy()` 成功;`stakeOf(wallet)` 记录正确;取回 `unstake()` 后余额归零且余额到账 | 正例 | F-27 |
| **AC-36** | 预存门槛关闭(`minStake = 0`)时无需预存即可购票 | 正例 | F-27 |
| **AC-37** | 预存冷却:存入后未满冷却时间不可用该笔保证金购票(revert `"Stake cooling down"`) | 反例 | F-27 |
| **AC-38** | **溯源**:`provenance(tokenId)` 返回发行方、首次买家、当前持有人、铸造时间、使用状态;与 `Transfer` 事件一致 | 正例 | F-28 |
| **AC-39** | 票面与前端展示「发行方 / 首次买家 / 当前持有人」;任何人可核对链上日志 | 正例 | F-28 |
| **AC-40** | **课程合规**:四层架构可演示(前端→ethers→MetaMask→Sepolia 合约);README 含部署交易哈希与合约地址;≥6 类链上交易 + ≥4 类 revert 有截图/记录 | 合规 | 全部 |

---

## 8. 合约接口契约 v2.0(设计目标,供 P1 实现)

> 本阶段**没有已部署合约**;下列为目标接口,实现时以本文为准,签名可微调但语义不得变。

**状态变量(目标)**

```solidity
struct Show {
    string  name;
    string  poster;         // data URI 或 URL
    uint256 price;          // wei
    bool    saleOpen;
    bool    rulesFrozen;    // 开售后冻结策略与门槛
    ResalePolicy resalePolicy;  // Closed / Open / Detect
    uint256 minStake;       // 0 = 关闭预存门槛
    uint256 nextTicketNo;   // 本场票号,从 1 开始
}
enum ResalePolicy { Closed, Open, Detect }

mapping(uint256 => Show) public shows;
mapping(address => mapping(uint256 => bool))   public hasBought;   // 钱包 => showId
mapping(address => mapping(uint256 => uint256)) public ticketOf;   // 钱包 => showId => 票号
mapping(uint256 => uint256) public tokenShow;      // tokenId => showId
mapping(uint256 => address) public mintHolder;     // tokenId => 首次买家(F-28 溯源)
mapping(uint256 => bool)    public used;           // tokenId => 已验票
mapping(address => uint256) public stakeOf;        // 钱包 => 预存额(F-27)
mapping(address => uint256) public stakeSince;     // 钱包 => 最近存入时间(冷却判定)
uint256 public showCount;

// —— 资金隔离(必须实现的不变量,2026-10-19 Lead 采纳 requirements 提案)——
uint256 public ticketRevenue;   // 累计票款(仅此部分可被 withdraw 提取)
uint256 public totalStaked;     // 保证金池总额
// 不变量: address(this).balance == ticketRevenue + totalStaked
// 须在 stake / unstake / buy / verify / withdraw 后成立,并写入 §7 AC 与 TC 用例;
// withdraw() 只提取 ticketRevenue,不得动用保证金池。
```

**写函数**

| 函数 | 权限 | 参数 | revert 文案(逐字) | 事件 | 状态变化 |
|---|---|---|---|---|---|
| `createShow(string name,string poster,uint256 price,uint8 resalePolicy,uint256 minStake)` | onlyOwner | 策略 0/1/2 | `"Invalid resale policy"` | `ShowCreated` | 新建 show,saleOpen=false |
| `setPrice(uint256 showId,uint256 newPrice)` | onlyOwner | — | `"Rules are frozen after sale opens"`(开售后) | `PriceUpdated` | 更新 price |
| `setResalePolicy(uint256 showId,uint8 resalePolicy)` | onlyOwner | 策略 0/1/2 | `"Rules are frozen after sale opens"`(开售后)/ `"Invalid resale policy"` | `ResalePolicyUpdated` | 仅开售前可改策略 |
| `setStakeRequirement(uint256 showId,uint256 minStake)` | onlyOwner | — | `"Rules are frozen after sale opens"`(开售后) | `StakeRequirementUpdated` | 仅开售前可改门槛;0=关闭 |
| `openSale(uint256 showId)` | onlyOwner | — | — | `SaleToggled` | saleOpen=true, rulesFrozen=true |
| `closeSale(uint256 showId)` | onlyOwner | — | — | `SaleToggled` | saleOpen=false |
| `stake()` payable | 任何人 | msg.value>0 | `"Stake must be positive"` | `Staked` | stakeOf += msg.value;stakeSince=now |
| `unstake(uint256 amount)` | 任何有预存者 | — | `"Insufficient stake"` | `Unstaked` | stakeOf -= amount,转账 |
| `buy(uint256 showId)` payable | 任何人 | 精确票价 | `"Sale is not open"` / `"One ticket per wallet"` / `"Send the exact ticket price"` / `"Insufficient stake"` / `"Stake cooling down"` | `TicketBought` | 铸造 NFT 给买家;写 mintHolder/hasBought/ticketOf/tokenShow |
| `verify(uint256 showId,uint256 tokenId)` | onlyOwner(或一次性 venue 授权) | — | `"Ticket does not belong to this show"` / `"Ticket already used"` / `"Resale not permitted"`(策略判定) | `TicketVerified` | used=true |
| `withdraw()` | onlyOwner | — | — | `Withdrawn` | 提取票款(不含 stake 池) |
| `transferFrom` / `safeTransferFrom` | 持有人 | — | `"Resale not permitted"`(Closed 策略) | `Transfer` | 所有权变更(Open/Detect) |

**读函数**

`showCount()` · `shows(uint256)` · `issuer(uint256 showId)` · `mintedAt(uint256 tokenId)` · `hasBought(address,uint256)` · `ticketOf(address,uint256)` · `tokenShow(uint256)` · `ownerOf(uint256)` · `used(uint256)` · `mintHolder(uint256)` · `tokenURI(uint256)` · `stakeOf(address)` · `provenance(uint256) returns (address issuer, address firstBuyer, address currentHolder, uint256 mintedAt, bool used)`

**事件**

`ShowCreated(uint256 indexed showId,string name,string poster,uint256 price,uint8 resalePolicy,uint256 minStake)` · `PriceUpdated(uint256 indexed showId,uint256 newPrice)` · `SaleToggled(uint256 indexed showId,bool open)` · `ResalePolicyUpdated(uint256 indexed showId,uint8 resalePolicy)` · `StakeRequirementUpdated(uint256 indexed showId,uint256 minStake)` · `Staked(address indexed fan,uint256 amount,uint256 total)` · `Unstaked(address indexed fan,uint256 amount)` · `TicketBought(uint256 indexed showId,address indexed buyer,uint256 indexed tokenId,uint256 price)` · `TicketIssued(uint256 indexed showId,uint256 indexed tokenId,address indexed issuer,address buyer)` · `TicketVerified(uint256 indexed showId,uint256 indexed tokenId,address indexed venue)` · `Withdrawn(address indexed to,uint256 amount)`

**常量**:`STAKE_COOLDOWN`(建议 10 分钟,可在实现时定值但须写入 README 与 AC-37);`MIN_STAKE_FLOOR`(建议 0.001 ETH,防止商家设 1 wei 导致功能失效)。

---

## 9. 引用红线(7 条,与 v1.0 相同,继续适用)

1. Seatlab「2025-03 为 15 万+ 观众发 NFT 票」查无实据 —— **不得引用**;
2. Ticketmaster NFT 是纪念品/出席证明,**不是入场凭证**;
3. GET Protocol 已于 2024-03 更名 OPEN —— 写「GET/OPEN」;
4. GUTS「5 万张」是 2018-09 多场连开合计,不是单场;「Ziggo Dome 零黄牛」仅官方博文标题;
5. Ticketmaster「60% 门票被机器人买走」出自 Vice 2018;「12% 购票者被骗」不引用;Queue-it 的 40%/60–90% 是**流量口径**;
6. 市场数字口径不可混用:线上活动票务 85.35B / 全球原始出票 132B / 北美二级 18B(StubHub 招股书管理层估计);
7. ⚠️ 条目不直接引用(Tixel 买家费率、Blocktickets 是否仍铸造 NFT、Centaurify 发行量、DeFy「$15B/年」等)。

**学术 6 条硬结论**:Leslie & Sorensen 2014(转售提升配置效率约 5%,约 1/3 被寻租与交易成本抵消)· Cui/Duenyas/Şahin 2014(完全禁转可能损害主办方)· Zou & Jiang 2020(一级整合二级可能降费)· Feulner 等 2022(动态码+实名可被共享账号/SIM 绕过)· Regner 等 ICIS 2019(NFT 改进二级市场控制,代价 gas/延迟/隐私)· Harmanda 等 IEEE ICECOS 2024(26 篇综述多为原型,缺端到端)。**新增可引用**:黄牛检测军备竞赛(Iliou 等 2021/2022;PureNFT ICCE 2025 93.57%;ScalpWatch 2026 99.1%,均为作者自建数据)。

---

## 10. 一致性规则(四份文档)

1. 编号只用本文件 §4/§5/§7;合约函数/事件/revert 用 §8(逐字)。
2. 状态词只用 §4 的四个:`本期必做 / 本期可选(商家配置) / 建议(算法团队可选) / 后续`;**不得出现 v4/v5/已部署/未部署**。
3. **不得声称任何实现已完成**,不得出现合约地址、交易哈希、`ownerOf(1)`、`used(1)`、A1–A10、work-log。
4. 课程要求按 §1.2 表述;01 §1.8 与 02 §1.4 必须逐条覆盖 C-1…C-8。
5. A 类功能必须写「建议算法团队可选实现」+ 价值/风险/依赖/验收建议,不写成 Won't。
6. 报告(03/04)额外遵守 §1.3:独立学术叙事、不写课程内部语境、课程对齐以"自然吻合"一句表达。
7. 中文术语按 §2;报告英文用 §2 英文列。

---

## 11. 编号空间(不与 canon 冲突)

| 前缀 | 含义 | 归属 |
|---|---|---|
| `C-xx` | 合约接口条目 | 02 |
| `TC-xx` | 测试用例 | 02 |
| `OQ-xx` | 开放问题 | 02 |
| `R-xx` / `RSK-xx` | 风险 | 02 / 01(不共用编号) |
| `E-xx` | 异常场景 | 01 |
| `K/H/Q/D/RQ/EV` | 约束/假设/待确认/决策/需求/证据 | 01 |
| `DEF-xx` | **已废弃**(v2.0 起不再使用) | — |
