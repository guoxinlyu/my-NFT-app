# LivePass 技术团队需求文档(02-requirements · v2.1)

> **文档状态**:**v2.1(终稿,已评审 94/100,0 high;medium 已闭环)** · **日期**:2026-10-19
> **读者**:P1(智能合约)、P2(前端)、P3(Web3 集成)、P4(测试与部署);P5(产品与内容)用于口径对照
> **用途**:让技术团队**不需要再追问**,即可依次完成「原型 → 技术方案 → 开发 → 测试」,并支撑课程演示与英文报告的实现章节
> **唯一真源**:`deliverables/00-shared/canon.md` **v2.0**(F/P/AC 编号、状态词、票面状态机与转售策略、目标合约接口契约、定位与诚实边界)。本文与 canon 冲突时**以 canon 为准**
> **基线口径**:**本项目由技术团队从零实现**。本文全部内容为「待实现规格」,不含任何既有实现/部署/链上读数;所有状态词严格使用 canon §4 四词:`本期必做` / `本期可选(商家配置)` / `建议(算法团队可选)` / `后续`
> **本文档纪律**:不虚构;不声称任何功能已完成;不出现既有部署结果、交易哈希、历史验收记录;合约函数/revert/事件逐字对齐 canon §8

---

## 目录

- [0. 阅读指南与编号规则](#0-阅读指南与编号规则)
- [1. 范围、课程合规与实现证据](#1-范围课程合规与实现证据)
- [2. 角色与权限矩阵](#2-角色与权限矩阵)
- [3. 页面清单 P-01…P-12](#3-页面清单-p-01p-12)
- [4. 合约接口契约(目标接口)](#4-合约接口契约目标接口)
- [5. 前端组件与路由](#5-前端组件与路由)
- [6. 数据流](#6-数据流)
- [7. 验收标准 AC-01…AC-40](#7-验收标准-ac-01ac-40)
- [8. 非功能需求](#8-非功能需求)
- [9. 里程碑与依赖](#9-里程碑与依赖)
- [10. 开放问题与风险](#10-开放问题与风险)
- [11. A 类:建议算法团队可选实现](#11-a-类建议算法团队可选实现)
- [12. 附录](#12-附录)

---

# 0. 阅读指南与编号规则

## 0.1 如何使用本文档

| 角色 | 必读章节 | 用途 |
|---|---|---|
| **P1 智能合约** | §1、§2、§4、§7(合约层 AC)、§8.2、§9、§11 | 按 §4 目标接口实现合约;冻结 ABI;维护部署参数;为 A 类评审提供接口建议 |
| **P2 前端** | §3 全部、§5、§6.4、§8.3、§8.4 | 按页面规格直接开发;路由/组件/空错态/可访问性 |
| **P3 Web3 集成** | §2.3、§4、§5.3、§6 全部、§8.2 | 钱包连接、交易状态机、事件与轮询、错误解码、预存/策略读取 |
| **P4 测试与部署** | §1.4、§1.5、§7、§8、§9、§10、§12 | 用例执行、链上证据留档、水龙头与仓库终检、README 交付 |
| **P5 产品与内容** | §1、§3、§10、§12、canon §3 | 演示动线与报告「设计/实现」章节的口径来源 |

## 0.2 编号规则

| 前缀 | 含义 | 来源 | 使用规则 |
|---|---|---|---|
| **F-01…F-32** | 功能注册表 | canon §4 | 只引用,不新增、不改写;状态词用四词 |
| **P-01…P-12** | 页面注册表 | canon §5 | 只引用,不新增、不改写 |
| **AC-01…AC-40** | 验收标准 | canon §7 | 只引用;本文补充「判定步骤/测试数据/执行层」,不另编号 |
| **C-01…C-32** | 合约接口条目(本文档内部编号,canon §11 允许) | 本文 §4(按 canon §8 细化) | 函数签名/参数/revert/事件**逐字以 canon §8 为准** |
| **TC-01…TC-24** | 补充测试用例(本文档内部编号) | 本文 §7.2 | AC 的执行细则,不占用 AC 编号 |
| **OQ-01…OQ-12** | 开放问题 | 本文 §10.1 | 待决策项,含 owner 与截止 |
| **R-01…R-14** | 实现风险 | 本文 §10.2 | 风险登记册,含缓解措施 |
| **M0…M6** | 里程碑 | 本文 §9.1 | 主交付阶段 |
| `E-xx` / `V-xx` | 页面元素 / 表单校验规则(章节内局部) | 本文 §3 | 不参与跨文档引用 |

> **状态词**(canon §4,四词,不得自造第五个):`本期必做`(M,课程交付必须实现)、`本期可选(商家配置)`(**仅用于「功能本身可选实现」的项**;F-15/F-27 属本期必做,其「启用/配置由商家按演出决定」是描述属性、不是状态词)、`建议(算法团队可选)`(A 类,不实现也不影响课程交付)、`后续`(C/S 类,本期不做)。

## 0.3 文档纪律

1. **不声称已完成**:全文为待实现规格;不出现既成事实式表述(部署结果/上线状态/验收完成)。
2. **不虚构**:不写未来源的交易哈希、地址、余额、截图;实现证据由 P4 在实现阶段产出并写入 README/报告(§1.5)。
3. **合约口径唯一**:函数名、参数、revert 文案、事件签名一律按 canon §8;实现可微调签名但语义不得变,且必须在 README 记录差异。
4. **术语统一**:状态文案用 canon §6 四态;四词状态标签按 §0.2;英文术语按 canon §2。
5. **课程合规是规格不是叙事**:§1.4 的 C-1…C-8 是**必须满足的工程规格**,报告写作口径由报告文档负责,本文不写课程语境进产品叙事。

---

# 1. 范围、课程合规与实现证据

## 1.1 项目基线与本期范围

**项目定义**:LivePass 是一个「**大麦式体验 + 链上硬保证 + 规则可配置**」的链上演唱会票务 DApp(定位逐字见 canon §3)。它由 **P1–P4 从零实现**并部署到 Sepolia;本阶段交付的是「可施工的设计与需求」。

**本期交付范围(实现目标)**:

| 类别 | 内容 | 交付判定 |
|---|---|---|
| **本期必做(M)** | F-01…F-15、F-27、F-28(共 17 项,canon §4) | 全部实现且 AC-01…AC-29、AC-30…AC-40 中与本项相关条目通过 |
| **商家可配置(属性,非状态词)** | F-15 三策略与 F-27 门槛启用由商家按演出配置(`minStake=0` 关闭);**两者功能状态均为 `本期必做`** | 商家能在 P-07 配置并在链上生效;配置后开售即冻结 |
| **建议(算法团队可选,A 类)** | F-18、F-20、F-23、F-26、F-29、F-30、F-31、F-32 | **不实现也不影响课程交付**;本文 §11 给出目标/接口建议/数据需求/风险/验收建议 |
| **后续** | F-16、F-17、F-19、F-21、F-22、F-24、F-25 | 本期不做,接口与数据结构预留可扩展性 |

**本期实现边界**:

- 单合约(ERC-721 + Ownable),无代理升级、无外部预言机、无链下服务端;
- 前端为 SPA(React + Vite),通过 MetaMask 注入的 provider 与合约交互,不自建后端/数据库;
- 支付使用 Sepolia 测试 ETH(无真实资金);票价、保证金均为测试网数值。

## 1.2 系统组成与四层架构(规格)

```text
┌───────────────────────────── ① 前端(React 19 + Vite)─────────────────────────────┐
│ P-01 登录/钱包   P-02 海报墙   P-03 详情   P-04 交易浮层   P-05 票夹   P-06 票面       │
│ P-07 发布       P-08 管理     P-09 验票    P-10 票房      P-11 全局态  P-12 预存       │
└───────────────────────────────────┬───────────────────────────────────────────────────┘
                                    │ ③ ethers v6:BrowserProvider / Contract / queryFilter
┌───────────────────────────────────▼───────────────────────────────────────────────────┐
│ ④ MetaMask:账户授权、网络切换(11155111)、交易签名、用户拒绝回传                         │
└───────────────────────────────────┬───────────────────────────────────────────────────┘
                                    │ JSON-RPC(Sepolia)
┌───────────────────────────────────▼───────────────────────────────────────────────────┐
│ ② 智能合约 LivePass(Solidity ^0.8.20 + OpenZeppelin Contracts 5.x:ERC721 / Ownable / Base64)     │
│   演出与规则 · 购票与预存 · 验票打标 · 溯源视图 · 链上 SVG 票面 · 提现                  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

| 层 | 技术选型(规格) | 负责人 | 关键约束 |
|---|---|---|---|
| ① 前端 | React 19 + Vite 7(JavaScript)+ React Router | P2 | 路由化、可访问性、空/错/加载态齐全 |
| ② 智能合约 | Solidity `^0.8.20`(编译建议 solc 0.8.x,部署前锁定版本)+ OpenZeppelin Contracts 5.x(`ERC721`、`Ownable`、`Base64`、`Strings`) | P1 | 目标接口按 §4;revert/事件按 canon §8 |
| ③ 桥接 | ethers v6:`BrowserProvider`、`Contract`、`queryFilter`、`formatEther`、错误码 | P3 | 读免费 `eth_call`;写交易统一状态机 |
| ④ 钱包 | MetaMask 扩展(桌面 Chromium 系) | P3 | 连接授权、切链、签名、账户/网络事件监听 |

## 1.3 本期不做与「后续」边界

| 不做/后续项 | canon 状态 | 本期处置 | 产品理由(为何不放进本期必做) |
|---|---|---|---|
| F-16 固定价/限价转售市场 | 后续/建议 | 不做;预留 `resalePolicy` 扩展位 | 需要托管、撮合与争议处理,复杂度和资金风险高 |
| F-17 转赠(指定受赠人) | 后续 | 不做 | 与 F-15 策略协同需额外规则设计,本期以满足三策略为限 |
| F-19 动态防伪码 | 后续/建议 | 不做 | 需要服务端签发与时钟同步,超出单合约范围 |
| F-21 搜索/分类 | 后续 | 不做(仅前端分页) | 演出量级小,非核心链路 |
| F-22 多票档/座位 | 后续 | 不做 | 合约 Show 结构需扩展,影响本期接口稳定性 |
| F-24 POA/纪念徽章 | 后续 | 不做 | 复用已验状态,可增量实现 |
| F-25 团体票 | 后续 | 不做 | 「一人一票」规则的延伸,需组码核销 |
| F-18/F-20/F-23/F-26/F-29/F-30/F-31/F-32 | **建议(算法团队可选)** | 本文 §11 单列建议卡 | 涉及 KYC/合规、VRF 依赖、资金裁决或链下风控,属增强项而非课程交付必需 |

## 1.4 课程硬性要求 C-1…C-8(必须满足的工程规格)

> canon §1.2 的 C-1…C-8 是**课程交付必须满足的规格**。下表给「本项目如何满足」与「工程落点/验收引用」;实现阶段由 P4 逐条留证(§1.5)。

| # | 课程要求 | 本项目如何满足(规格) | 工程落点 | 验收引用 |
|---|---|---|---|---|
| **C-1** | 四层架构:前端 + 智能合约 + Ethers.js + MetaMask | ①React 19 SPA(P-01…P-12);②Solidity 合约(§4);③ethers v6 `BrowserProvider`/`Contract`/`queryFilter`;④MetaMask 连接/切链/签名 | §1.2、§5、§6 | AC-40(四层可演示) |
| **C-2** | 至少一次有意义的链上操作(真实交易/状态变更) | **≥6 类写交易**:①部署 ②`createShow`(≥3 场,覆盖 3 策略) ③`openSale` ④`buy`(≥1 笔带预存) ⑤`verify` ⑥`withdraw`;另须覆盖 **≥4 类 revert 反例**:未开售/金额不符/一人一票/策略拒绝(或预存不足/冷却中) | §4、§7、§9 M1-M2 | AC-01、AC-05、AC-07、AC-11、AC-30…AC-37、AC-40 |
| **C-3** | 部署在 Sepolia(chainId 11155111) | 全部写操作在 Sepolia;前端启动即校验网络,非目标链提示切换(拒绝则停留 P-01) | §2.3、§12.4 | AC-13、AC-40 |
| **C-4** | 团队 4–5 人、每人实质贡献、报告写贡献分工 | P1 合约 / P2 前端 / P3 集成 / P4 测试部署 / P5 产品与报告;git 提交带角色前缀,贡献分工写入 README 与报告 | §9.3 | AC-40(证据) |
| **C-5** | 演示视频 ≤15 分钟、英文、含 live demo | 实现阶段录制;本阶段给演示动线(P-01→P-02→P-03→购票→P-05→P-09 Check/Verify→P-10;含三策略与预存场景) | §3、§9 M6 | 视频交付 |
| **C-6** | 英文 PDF 报告:background/idea/design/implementation/contribution | 本阶段交付报告第 1 章;实现章节由团队后补,口径以本文 §4/§7 与 canon 为准 | 报告文档 | 报告交付 |
| **C-7** | 代码仓库:完整可运行源码 + 详细 README | 仓库根含 `contracts/`、`scripts/`、`src/`、`test/`、`README.md`;**README 必须含合约地址与部署交易哈希占位**(实现阶段填写) | §8.6、§12.4 | AC-01、AC-40 |
| **C-8** | 2026-11-08 23:59 截止 | 里程碑 M0–M6(§9.1),M4 联调验收完成不晚于 11-02,M6 留缓冲 | §9 | 时间线 |

## 1.5 实现阶段必须产出的链上证据清单(由 P4 执行并留档)

> **声明**:以下证据**尚未产生**;实现阶段由 P4 在 Sepolia 执行,写入 README 与报告,截图/记录由团队完成。本文只规定「必须产出什么」。

| # | 证据 | 最低要求 | 存储位置 |
|---|---|---|---|
| EV-1 | 部署记录 | 合约地址 + 部署交易哈希 + 部署区块号 + 编译器版本 | README「Deployment」 |
| EV-2 | 发布演出 | `createShow` ×3,分别配置 Closed / Open / Detect;含 `ShowCreated` 日志 | README「Evidence」+ 报告实现章 |
| EV-3 | 开售 | `openSale` ×3,含 `SaleToggled` 与 `rulesFrozen=true` 读数 | 同上 |
| EV-4 | 购票 | `buy` ≥3 笔(含向不同演出;≥1 笔在开启预存门槛的演出完成) | 同上 |
| EV-5 | 验票 | `verify` ≥2 笔,含 `TicketVerified` 与 `used=true` 读数 | 同上 |
| EV-6 | 提现 | `withdraw`,含 `Withdrawn` 与合约余额变化 | 同上 |
| EV-7 | 反例 revert | ≥4 类:未开售、金额不符、一人一票、Closed 转移拒绝 / Detect 验票拒绝 / 预存不足 / 冷却中 | README 表格 + 截图 |
| EV-8 | 溯源 | `provenance(tokenId)` 读数与 `TicketIssued`/`Transfer` 日志对照;P-06 溯源展示截图 | README + 报告 |
| EV-9 | 票面 | `tokenURI` 解码样例(S0/S0'/S1/S2 至少各 1 张可取)与 SVG 截图 | README + 报告 |
| EV-10 | 前端四层演示 | 连接 MetaMask、切链拒绝、交易确认/拒绝各 1 段录屏或截图 | 演示视频 |

## 1.6 诚实边界(必须随文档交付,canon §3)

1. **身份层缺失**:一人可开多钱包,链上不存身份;KYC/实名+人脸属**建议可选**能力(§11),不作为本项目承诺;
2. **资金**:Sepolia 测试网,无真实资金;
3. **场馆**:若实现为 `onlyOwner` 验票,须在 README/报告中如实说明「单一管理员钱包模拟闸机」,不得写成独立场馆角色;
4. **生态**:不承诺跨场馆互认;让非合作闸机作废实体票非本设计目标。

## 1.7 术语表(与 canon §2 一致)

| 中文 | 英文 | 说明 |
|---|---|---|
| 主办方 | organizer | 部署并管理演出的钱包(`owner()`) |
| 观众/粉丝 | fan | 购票者 |
| 场馆/验票方 | venue | 门口验票角色;本期由 `onlyOwner` 钱包执行,须如实说明 |
| 转售策略 | resale policy | Closed / Open / Detect,按演出配置,开售冻结 |
| 预存门槛 | stake requirement | 商家可选;购票前须预存至合约的最低保证金 |
| 保证金/预存额 | stake / deposit | 观众预存 ETH,可退还(`unstake`) |
| 票据溯源 | provenance | 发行方 + 首次买家 + 每次钱包变更的链上记录 |
| 票面状态机 | ticket state machine | S0 / S0' / S1 / S2(§4.6) |

---
# 2. 角色与权限矩阵

## 2.1 角色定义

| 角色 | 英文 | 钱包 | 权限来源 | 本期规格 |
|---|---|---|---|---|
| **主办方** | organizer | 部署合约的钱包,即 `owner()` | OpenZeppelin `Ownable` 的 `onlyOwner` | 发布/调价/开售/停售/验票/提现/配置策略与门槛 |
| **观众/粉丝** | fan | 任意非 owner 钱包(或 owner 自身也可购票) | 无特权,调用 `buy()`/`stake()`/`unstake()`/ERC-721 转移 | 海报墙→详情→预存(可选)→购票→票夹→出示票面 |
| **场馆/验票方** | venue | **本期 = 主办方钱包(`onlyOwner`)** | `verify()` 的 `onlyOwner` | 门口 Check(零 gas)+ Verify(上链打标) |
| (课程)验收/演示 | evaluator | 任意浏览器 + MetaMask + Etherscan | 无需特权即可只读核对 | 按 §7 AC 验收、按 §1.5 留证 |

> **诚实口径(必须在 README 与报告中如实说明)**:本期场馆验票由主办方钱包执行,不存在独立场馆角色。若实现「一次性 venue 授权」扩展(见 §2.2),必须同时说明授权者与有效期,不得写成两个独立角色的完整权限体系。

## 2.2 权限矩阵

图例:✅ 允许;❌ 合约拒绝(revert);— 不涉及。所有拒绝均由**合约**保证,前端隐藏按钮不构成安全边界。

| 动作 | 合约入口 | 主办方(owner) | 观众(fan) | 场馆 | 页面 |
|---|---|---|---|---|---|
| 发布演出 | `createShow`(C-01) | ✅ | ❌ `OwnableUnauthorizedAccount` | ❌ | P-07 |
| 调价(开售前) | `setPrice`(C-02) | ✅ | ❌ | ❌ | P-08 |
| 开售/停售 | `openSale`/`closeSale`(C-03/C-04) | ✅ | ❌ | ❌ | P-08 |
| 配置转售策略/预存门槛 | `createShow` 一次写入;开售前可用 C-31 `setResalePolicy` / C-32 `setStakeRequirement` 调整;开售后冻结 | ✅(开售前) | ❌ | ❌ | P-07/P-08 |
| 预存保证金 | `stake()`(C-05) | ✅ | ✅ | — | P-12 |
| 取回保证金 | `unstake(amount)`(C-06) | ✅ | ✅ | — | P-12 |
| 购票 | `buy(showId)`(C-07) | ✅ | ✅ | — | P-03 |
| 验票预检 Check | 只读(§4.3) | ✅ | ✅(只读免费) | ✅ | P-09 |
| 验票 Verify | `verify`(C-08) | ✅ | ❌ `OwnableUnauthorizedAccount` | **仅当为 owner 钱包** | P-09 |
| 提现票款 | `withdraw()`(C-09) | ✅ | ❌ | ❌ | P-10 |
| NFT 转移 | `transferFrom`/`safeTransferFrom`(C-10/C-11) | 票持有人 | 票持有人(受策略约束) | — | 合约/Etherscan;前端不设转移入口 |
| 查询票面/溯源 | 只读(§4.3) | ✅ | ✅ | ✅ | P-05/P-06/P-09 |
| 所有权转移 | `transferOwnership`(OZ) | ✅ | ❌ | ❌ | **前端不提供入口**,仅 Etherscan 可用 |

**三条权限事实**:

1. **`owner()` 是动态的**:前端每次加载都用 `owner()` 与当前钱包比对;所有权被转移后,新钱包自动成为主办方。前端**不提供** `transferOwnership`/`renounceOwnership` 入口;若测试中执行,须在 README 记录,并注意 `renounceOwnership` 会使全部管理功能永久失效。
2. **验票权限**:本期 `verify()` 为 `onlyOwner`。若 P1 实现「一次性 venue 授权」(可选扩展),接口须新增 `setVenue(address)` 并配套事件,且必须在 README/报告说明;本文 C-08 按 `onlyOwner` 定义。
3. **策略与门槛的冻结**:转售策略与预存门槛在 `openSale()` 时冻结(`rulesFrozen = true`),此后 `setPrice` 与任何规则修改均 revert `"Rules are frozen after sale opens"`;前端 P-08 必须在开售后隐藏调价/规则编辑入口。

## 2.3 前端角色判定与账户生命周期

```text
连接后:
  provider = new BrowserProvider(window.ethereum)
  signer   = await provider.getSigner()
  wallet   = await signer.getAddress()
  chainId  = await window.ethereum.request({ method: "eth_chainId" })
  ownerAddr = await contract.owner()          // C-14
  role = wallet.toLowerCase() === ownerAddr.toLowerCase() ? "organizer" : "fan"
```

- **必须**在 `owner()` 读取失败(RPC 异常)时显示 P-11 错误态 + Retry,不得默认判为 fan;
- **必须**监听 `accountsChanged`:**清空链上数据与页面局部状态**,按新钱包重新判定角色;角色变化时跳转对应首页(organizer→`/admin/shows`,fan→`/shows`);
- **必须**监听 `chainChanged`:重新校验网络;非 Sepolia 时保留页面但覆盖 P-11 网络提示并禁用全部写按钮;
- **用户拒绝签名(4001)** 必须是中性「已取消」,不是红色错误(AC-14);
- MetaMask 账户绑定坑:侧栏切换账户后站点可能仍绑定旧账户;**切换账户后必须「断开连接→切换→重新连接」**,演示动线须包含该步骤。

---
# 3. 页面清单 P-01…P-12

## 3.0 全局约定

### 3.0.1 路由事实与实现要求

> 本项目为**从零实现**,前端**必须使用 React Router 实现 canon §5 的目标路由**(不是单组件视图切换)。本表同时是 P2 的路由实现规格与 P4 的路由验收依据。

| 路由 | 页面 | 守卫 | 数据依赖 | 验收 |
|---|---|---|---|---|
| `/` | P-01 登录 | 无;已连接按角色重定向 | `owner()` | AC-12/13/16 |
| `/shows` | P-02 海报墙 | 需已连接 | `showCount`、`shows` | AC-17/25 |
| `/shows/:showId` | P-03 详情 | 需已连接;showId 合法 | `shows(id)`、`hasBought`、`stakeOf` | AC-18/24 |
| `/tickets` | P-05 票夹 | 需已连接 | `Transfer` 事件枚举 + `ownerOf` | AC-19/28 |
| `/tickets/:tokenId` | P-06 票面 | 需已连接 | `tokenURI`、`provenance`、`shows` | AC-10/21/38/39 |
| `/admin/new` | P-07 发布 | 需 owner | — | AC-30…AC-33 配置 |
| `/admin/shows` | P-08 管理 | 需 owner | `showCount`、`shows` | AC-03/33 |
| `/admin/verify` | P-09 验票 | 需 owner | `ownerOf`、`used`、`mintHolder`、`shows` | AC-07/08/20/27 |
| `/admin/revenue` | P-10 票房 | 需 owner | `showCount`、事件计数、`getBalance` | AC-11/26/29 |
| `/stake` | P-12 预存 | 需已连接 | `stakeOf`、`stakeSince`、`shows` | AC-34…AC-37 |
| `*` | 404 | 无 | — | P-11 |
| 全局 | P-04 交易浮层 / P-11 全局态 | — | — | AC-14/15/22/23 |

### 3.0.2 设计令牌与布局基线

| 项 | 规格 |
|---|---|
| 根容器 | 深色主题(`#050510` 基底 + 紫/品红/青三组径向渐变光斑);内容 `max-width:1080px; margin:0 auto; padding:1.6rem 2rem 5.5rem` |
| 主色 | violet `#7c3aed` · fuchsia `#d946ef` · cyan `#22d3ee` · green `#34d399` · red `#fb7185` · amber `#fbbf24` · text `#e6e3f5` · dim `#9a93b8` |
| 卡片 | 玻璃拟态:`rgba(22,18,46,0.55)` + `backdrop-filter: blur(22px)` + 1px 紫边 + 圆角 22px |
| 顶栏 | 左:🎫 LivePass;中:导航 tabs;右:角色徽章 + 短地址 + `Switch wallet` |
| 状态胶囊 | 销售:`● ON SALE`(绿)/`○ CLOSED`(红);票面:S0 青 / S0' 琥珀 / S1 绿 / S2 红(文案见 §4.6) |
| 响应式 | 网格 `repeat(auto-fill,minmax(240px,1fr))`;≤640px 单列(实现要求);TopBar `flex-wrap` |
| 动效 | 允许轻量入场/悬停动效;必须支持 `prefers-reduced-motion` 降级(§8.3) |

### 3.0.3 通用状态

| 状态 | 触发 | 展示 |
|---|---|---|
| loading | 数据读取中 | 骨架屏(不阻塞布局) |
| empty | 数据为空 | 空态文案 + CTA(各页单独规定) |
| error | RPC/解码/交易失败 | P-11 `ErrorState` + Retry;revert 原文必须原样显示 |
| disabled | 未连接/非 owner/未 Check/冷却中 | 按钮禁用 + 原因提示 |

### 3.0.4 页面清单总表

| 编号 | 页面 | 角色 | 目标路由 | 主要依赖(C 编号) |
|---|---|---|---|---|
| P-01 | 登录/钱包连接 | 全体 | `/` | C-14 `owner()` |
| P-02 | 观众海报墙 | 观众 | `/shows` | C-12 `showCount`、C-13 `shows` |
| P-03 | 演出详情 | 观众 | `/shows/:showId` | C-13、C-16 `hasBought`、C-22 `stakeOf` |
| P-04 | 交易状态浮层 | 全体 | 全局组件 | 全部写函数 |
| P-05 | 我的票夹 | 观众 | `/tickets` | `Transfer` 事件、C-15 `ownerOf`、C-18 `used` |
| P-06 | 票面详情/入场凭证 | 观众 | `/tickets/:tokenId` | C-20 `tokenURI`、C-21 `provenance`、C-13 |
| P-07 | 发布演出 | 主办方 | `/admin/new` | C-01 `createShow` |
| P-08 | 演出管理 | 主办方 | `/admin/shows` | C-13、C-02/C-03/C-04 |
| P-09 | 验票面板 | 场馆 | `/admin/verify` | C-15/C-17 `mintHolder`/C-18、C-08 `verify` |
| P-10 | 票房与提现 | 主办方 | `/admin/revenue` | C-12、`TicketBought` 计数、C-24 `getBalance`、C-09 |
| P-11 | 全局状态与提示 | 全体 | 全局 | — |
| P-12 | 预存与购票资格 | 观众 | `/stake` | C-05 `stake`、C-06 `unstake`、C-22 `stakeOf`、C-23 `stakeSince` |

## 3.1 P-01 登录 / 钱包连接页

**路由/守卫**:`/`;无守卫,已连接按角色重定向(owner→`/admin/shows`,fan→`/shows`)。**进入前不得发起任何合约读**(AC-12)。

| 编号 | 元素 | 类型 | 文案/格式 | 交互 |
|---|---|---|---|---|
| E-01-1 | 品牌标题 | 文本 | `🎫 LivePass` | — |
| E-01-2 | 定位标签行 | 文本 | `✦ On-chain · Sepolia · One ticket per wallet per show ✦` | — |
| E-01-3 | 副标题 | 文本 | `The blockchain ticketing marketplace — organizers publish shows, fans buy and hold tickets in their wallets, the venue verifies at the door.` | — |
| E-01-4 | 连接按钮 | 主按钮 | `🔗 Connect Wallet & Enter` | 点击 → 连接流程 |
| E-01-5 | 帮助文本 | 文本 | `MetaMask required · organizers and fans both enter here` | — |
| E-01-6 | 错误区 | 内联错误 | 见下表 | 条件渲染 |

**交互流程**:

```text
[Connect] → ①无 window.ethereum:报「未检测到 MetaMask,请安装浏览器扩展后刷新」;
          → ②eth_requestAccounts(用户拒绝 → 「已取消钱包连接」,按钮恢复);
          → ③eth_chainId ≠ 0xaa36a7 → wallet_switchEthereumChain:
                拒绝 → 停留 P-01 + 「需要 Sepolia 测试网才能使用本应用」;
                4902(链未添加)→ wallet_addEthereumChain(参数见 §12.4)后重试;
          → ④owner() 与 wallet 比对 → owner: /admin/shows;否则 /shows。
```

**空/错误态**:未安装 MetaMask、用户拒绝连接、链切换拒绝、链未添加(自动 add)、`owner()` 读取失败(→ P-11 错误态 + Retry,**不得**默认进 fan)。

**跳转**:连接成功按角色;`Switch wallet` 在其他页点击时清空状态回 `/`。

**文字线框**:

```text
┌──────────────────────────────────────────────────────────┐
│  ✦ ON-CHAIN · SEPOLIA · ONE TICKET PER WALLET PER SHOW ✦ │
│                    🎫 LivePass                            │
│   The blockchain ticketing marketplace — organizers …    │
│              [ 🔗 Connect Wallet & Enter ]                │
│     MetaMask required · organizers and fans both enter    │
│         ┌ 错误提示(如:已取消钱包连接)┐                  │
└──────────────────────────────────────────────────────────┘
```

## 3.2 P-02 观众海报墙

**路由/守卫**:`/shows`;需已连接。数据:`showCount()` + 循环 `shows(i)`(免费 `eth_call`,并行)。

| 编号 | 元素 | 类型 | 文案/格式 | 数据来源 |
|---|---|---|---|---|
| E-02-1 | 顶栏 | TopBar | 导航:`🏠 Shows` / `🎟️ My Tickets` / `💳 Stake`;右:`♥ FAN` + 短地址 + Switch wallet | wallet/role |
| E-02-2 | 标题 | H2 | `Now Showing` | 静态 |
| E-02-3 | 演出网格 | 卡片列表 | `repeat(auto-fill,minmax(240px,1fr))`,gap 20 | `shows(i)` |
| E-02-4 | 海报 | 图片 | 高 170px,`object-fit:cover`;加载失败→渐变占位 | `show.poster` |
| E-02-5 | 演出名 | 文本 | 16px 700 | `show.name` |
| E-02-6 | 票价 | 文本 | `{formatEther(price)} ETH`(原样,不过度舍入,AC-25) | `show.price` |
| E-02-7 | 销售状态 | 胶囊 | `● ON SALE`(绿)/`○ CLOSED`(红) | `show.saleOpen` |
| E-02-8 | **转售策略标签** | 胶囊 | `Resale: Closed` / `Resale: Open` / `Resale: Detect` | `show.resalePolicy` |
| E-02-9 | **预存门槛标签** | 胶囊 | `Stake required: {formatEther(minStake)} ETH`;`minStake=0` 不显示 | `show.minStake` |
| E-02-10 | 空态 | 卡片 | `No shows yet — the organizer is preparing something special. ✨` + 刷新 | `showCount=0` |
| E-02-11 | 加载/错误 | 文本/组件 | `Loading shows…` / P-11 `ErrorState` + Retry | — |

**交互**:点卡片→`/shows/:showId`;tab→`/tickets` 或 `/stake`;刷新按钮重新读链。**分页**:`showCount>12` 时前端每页 12 条。

**文字线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ 🎫 LivePass  [🏠 Shows][🎟️ My Tickets][💳 Stake]  ♥ FAN 0x…│
│ Now Showing                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│ │ [海报]    │ │ [海报]    │ │ [海报]    │                    │
│ │ Neon     │ │ Midnight │ │ Starlight│                    │
│ │ 0.01 ETH │ │ 0.008 ETH│ │ 0.005 ETH│                    │
│ │ ●ON SALE │ │ ●ON SALE │ │ ○CLOSED  │                    │
│ │ Resale:Closed │ Resale:Open │ Resale:Detect │             │
│ │ Stake:0.002 ETH │ —       │ —        │                    │
└────────────────────────────────────────────────────────────┘
```

## 3.3 P-03 演出详情页

**路由/守卫**:`/shows/:showId`;需已连接;`showId` 必须为 `0 ≤ id < showCount()` 的整数,否则「演出不存在」空态。

| 编号 | 元素 | 类型 | 文案/格式 | 数据来源 |
|---|---|---|---|---|
| E-03-1 | 返回 | ghost | `← Back to shows` | — |
| E-03-2 | 主视觉 | 图片 | 高 360px;叠加演出名 + `LivePass · Sepolia Testnet` | `poster`/`name` |
| E-03-3 | 销售状态 | 胶囊 | `● ON SALE` / `○ SALE CLOSED` | `saleOpen` |
| E-03-4 | 票价 | 文本 | `TICKET PRICE` + `{formatEther(price)} ETH` | `price` |
| E-03-5 | **转售策略说明** | 说明块 | Closed:`不得转售,合约将拒绝任何转账`;Open:`可转售,转移后仍可入场`;Detect:`可转售,但转售后入场将被拒绝` | `resalePolicy` |
| E-03-6 | **预存门槛说明** | 说明块 | `购票前需预存 ≥ {minStake} ETH;可随时取回(冷却 {STAKE_COOLDOWN} 后可用于购票)`;`minStake=0` 显示「本场无需预存」 | `minStake`、常量 |
| E-03-7 | **我的资格** | 内联提示 | `已预存 {stakeOf} ETH` / `预存不足,还差 {minStake - stakeOf} ETH → [去预存]` / `冷却中,{剩余时间} 后可购票` | `stakeOf`、`stakeSince` |
| E-03-8 | 购票按钮 | 主按钮 | `🎟️ Buy Ticket` / `🔒 Sale Closed` / `⏳ Processing…` | `saleOpen`、busy |
| E-03-9 | 已购提示 | 内联 | `你已购买本场演出的一张票(每钱包每场一张)` + 「去票夹」 | `hasBought` |
| E-03-10 | 交易结果 | P-04 | 见 §3.4 | — |
| E-03-11 | 演出不存在 | 空态 | `Show not found.` + 返回按钮 | 数据越界 |

**购票交互(完整)**:

```text
[Buy] → 前置校验:已连接 && saleOpen && !hasBought && !busy
  → 免费预检:hasBought(wallet,showId)、stakeOf(wallet) vs minStake、stakeSince + STAKE_COOLDOWN
       已购 → 禁用并提示;预存不足 → 引导 P-12;冷却中 → 显示倒计时,禁用
  → P-04 awaiting_signature → buy(showId,{ value: price })(C-07)
  → pending(tx.hash + Etherscan)→ tx.wait(1)
  → 成功:receipt.logs 解析 TicketBought 得 tokenId;提示「🎫 Ticket secured — it's in your wallet!」+ 去票夹
  → 失败:4001→rejected;CALL_EXCEPTION→reverted(原文 + 中文解释);余额不足→failed
```

**空/错误态**:加载骨架、演出不存在、已停售、已购、预存不足、冷却中、revert 原文(含 `"Insufficient stake"`、`"Stake cooling down"`、`"One ticket per wallet"`、`"Send the exact ticket price"`)、RPC 失败。

**文字线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ [← Back to shows]                                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │                [ 演出海报 360px ]         ● ON SALE     │ │
│ │  Neon Nights Festival                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│ TICKET PRICE 0.01 ETH                    [ 🎟️ Buy Ticket ]  │
│ Resale: Closed — 不得转售,合约拒绝任何转账                   │
│ Stake: 购票前需预存 ≥ 0.002 ETH;可随时取回                   │
│ ┌ 我的资格:已预存 0.002 ETH · 冷却中 03:20 后可购票 ┐(条件) │
└────────────────────────────────────────────────────────────┘
```

## 3.4 P-04 交易状态浮层

**定位**:全局组件,所有写操作共用;同一时刻只允许 1 笔在途交易(全局 tx lock)。

**状态机**:

```text
idle → preparing(校验/只读预检)→ awaiting_signature(请在 MetaMask 确认)
     ├─用户拒绝(4001)→ rejected(已取消交易)
     ├─钱包报错/余额不足→ failed
     └─已广播 → pending(tx.hash)→ confirmed | reverted | failed
```

| 状态 | UI | 可关闭 | 后续动作 |
|---|---|---|---|
| preparing | `⏳ 准备交易…` | 否 | 只读预检 |
| awaiting_signature | `🦊 请在 MetaMask 中确认交易` | 否 | 用户操作钱包 |
| pending | `⏳ 等待链上确认…` + `Tx: 0x…` + Etherscan 链接 + 「通常数秒到 2 分钟」 | **否** | 等待 receipt |
| confirmed | `✅ {成功文案}` + 哈希 + `Block #n` + 动作链接 | 可;5 秒后自动收起 | 触发 §6.4 刷新 |
| reverted | `⛔ 交易被合约拒绝:{reason 原文}` + 中文解释 | 可 | 允许重试 |
| rejected | `已取消交易`(中性) | 可 | 按钮恢复 |
| failed | `交易失败:{友好文案}` + 重试 | 可 | 允许重试 |

**规则**:①pending 必须显示哈希;②`tx.wait(1)`;③不自动重试;④确认后解析 receipt 事件(§6.2.3);⑤路由跳转不得丢失在途状态(状态置于 Provider 层);⑥`aria-live="assertive"`。

**线框**:

```text
pending : ⏳ 等待链上确认… · 购票 0.01 ETH · Tx 0x1234…abcd [Etherscan ↗]
confirmed: ✅ 购票成功 · Ticket #1 · token #4 · Block #12345678 [去票夹 →]
reverted : ⛔ 交易被合约拒绝:Insufficient stake  解释:预存不足,请先前往 P-12 预存
```

## 3.5 P-05 我的票夹

**路由/守卫**:`/tickets`;需已连接。**枚举规则(必须)**:按**所有权**枚举,不得用购买记录(AC-19)。

```text
① usedTokenIds = queryFilter(contract.filters.Transfer(null, wallet), fromBlock=部署区块, toBlock=latest)  // 分块
② 对每个候选 tokenId:ownerOf(tokenId) === wallet ? 保留 : 跳过(已转出)
③ showId = tokenShow(tokenId);used = used(tokenId);show = shows(showId)
   ticketNo = ticketOf(wallet, showId) > 0 ? ticketOf : "—"(受让票无票号,禁止显示 Ticket #0)
④ 按 showId 升序;同一 showId 多张(自购 + 受让)按 tokenId 升序并列
```

| 编号 | 元素 | 文案/格式 | 数据来源 |
|---|---|---|---|
| E-05-1 | 顶栏 | 同 P-02(tab 高亮 My Tickets) | — |
| E-05-2 | 标题 | `My Tickets` + `[↻ Refresh]` | — |
| E-05-3 | 票卡 | 海报缩略图 110×74 + 演出名 + `Ticket #{n} · token #{id}` | `shows`/`ticketOf`/tokenId |
| E-05-4 | 状态胶囊 | S0 `◈ UNUSED · VALID` / S0' `⇄ TRANSFERRED · ADMISSIBLE` / S1 `✓ VERIFIED · ADMIT` / S2 `✕ RESOLD · NOT ADMISSIBLE` | `used` + `ownerOf`/`mintHolder` + `resalePolicy` |
| E-05-5 | 溯源入口 | `Provenance →`(进 P-06 溯源区) | `provenance` |
| E-05-6 | Etherscan 链接 | `View NFT on Etherscan →` | tokenId |
| E-05-7 | 空态 | `No tickets yet — browse the shows and grab one! 🌙` + 去海报墙 | 无票 |
| E-05-8 | 状态实时性 | 每 30 秒轮询当前显示票的 `used`(页面可见时) | AC-21 |

**空/错误态**:空态见 E-05-7;枚举事件失败→P-11 错误态 + Retry;单票读取失败→该卡降级(保留其他卡)。

**线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ 🎫 LivePass  [🏠 Shows][🎟️ My Tickets][💳 Stake]   ♥ FAN   │
│ My Tickets                                     [↻ Refresh] │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [海报] Neon Nights Festival                          │   │
│ │        Ticket #1 · token #1    ◈ UNUSED · VALID      │   │
│ │        Provenance →        View NFT on Etherscan →   │   │
│ └──────────────────────────────────────────────────────┘   │
│  [空态] No tickets yet — browse the shows and grab one! 🌙  │
└────────────────────────────────────────────────────────────┘
```

## 3.6 P-06 票面详情 / 入场凭证页

**路由**:`/tickets/:tokenId`;需已连接。数据:`tokenURI`、`provenance`、`shows`、`used`、`ownerOf`。

| 编号 | 元素 | 文案/格式 | 数据来源 |
|---|---|---|---|
| E-06-1 | 返回 | `← Back to my tickets` | — |
| E-06-2 | 链上票面 | `tokenURI` 解码后的 SVG(data URI),宽度 100% 等比 | C-20 |
| E-06-3 | 演出信息 | 演出名 + `Show #{showId}` + 价格 | C-13 |
| E-06-4 | 票号 | `Ticket #{ticketNo}`;受让票显示 `Ticket #—(无票号)` | C-19 `ticketOf` |
| E-06-5 | tokenId | `Token #{tokenId}` | 路由参数 |
| E-06-6 | **溯源信息** | `Issuer {issuer}` / `First buyer {mintHolder}` / `Current holder {ownerOf}` / `Minted at {mintedAt}` / `Status` | C-21 `provenance` |
| E-06-7 | 链上状态 | S0/S0'/S1/S2 胶囊(文案 §4.6)+ 策略说明(`Resale: X`) | `used`/`ownerOf`/`mintHolder`/`resalePolicy` |
| E-06-8 | 入场说明 | `入场时向场馆出示本页与钱包地址;截图不作为入场凭证` | 静态 |
| E-06-9 | 链接 | `View NFT on Etherscan →` / `View contract →` / `查看演出详情 →` | — |
| E-06-10 | 票不存在 | `票不存在或尚未铸造` + 返回 | C-20/C-21 revert |
| E-06-11 | 解码失败 | `链上票面数据无法解析` + 原始 data URI 截断(≤120 字符)+ Etherscan 链接 | — |

**票面渲染流程**:`tokenURI` → 校验前缀 `data:application/json;base64,` → base64→bytes→**TextDecoder UTF-8** → `JSON.parse` → 取 `image`(data:image/svg+xml;base64) → `<img>` 渲染。`JSON.parse` 失败→E-06-11(根因:合约手工拼 JSON,演出名/发行方字段未转义,见 §8.2.5)。

**空/错误态**:不存在、解码失败、非当前钱包持有(仍可展示,顶部琥珀提示「该票不属于当前钱包」)、RPC 失败。

**线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ [← Back to my tickets]                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │        [ 链上 SVG 票面 600×300 等比 ]                  │ │
│ └────────────────────────────────────────────────────────┘ │
│ Neon Nights Festival · Show #0 · 0.01 ETH                  │
│ Ticket #1 · Token #1 · Issuer 0x… · First buyer 0x…        │
│ Current holder 0x… · Minted at 2026-10-xx 12:00 UTC        │
│ Resale: Closed     状态:◈ UNUSED · VALID                   │
│ ┌ 入场说明:入场时出示本页与钱包地址;截图不作为入场凭证 ┐   │
│ View NFT on Etherscan →   View contract →  演出详情 →      │
└────────────────────────────────────────────────────────────┘
```

## 3.7 P-07 主办方 — 发布演出

**路由/守卫**:`/admin/new`;需 owner。写函数:`createShow`(C-01)。

| 编号 | 元素 | 类型 | 校验/说明 |
|---|---|---|---|
| E-07-1 | 演出名 | `<input>` | 必填;trim 后 1–64 字符;**禁止** `"` `\` `<` `>` `&` 与控制字符(合约票面手工拼 JSON/SVG,见 §8.2.5) |
| E-07-2 | 票价 | `<input>` | 必填;十进制 ETH `>0`;最多 18 位小数;避免浮点精度(§3.7 `parseEthToWei`);上限建议 100 ETH(前端护栏) |
| E-07-3 | 海报 | 选择器 | 7 张自托管海报任选 1(或输入合法图片 URL);默认第 1 张 |
| E-07-4 | **转售策略** | 单选(3) | `Closed 禁止转售` / `Open 允许转售` / `Detect 记录但入场拒绝`;**开售后不可改** |
| E-07-5 | **预存门槛** | `<input>` | `0` = 关闭;`>0` 时单位 ETH 且 **≥ MIN_STAKE_FLOOR(0.001 ETH,前端校验)**;转成 wei 写入 |
| E-07-6 | 发布按钮 | 主按钮 | 名称/价格/策略/门槛合法且非 busy 时可点;调用 `createShow(name, poster, price, policyIndex, minStakeWei)` |
| E-07-7 | 交易状态 | P-04 | 成功后解析 `ShowCreated` 得 showId;清空表单;跳转 `/admin/shows` |

**表单校验规则 V-07(实现必须逐条覆盖)**:

| 规则 | 字段 | 规则 | 失败提示 |
|---|---|---|---|
| V-07-1 | name | 必填;trim 后 1–64 字符 | `请输入演出名称` / `名称最长 64 个字符` |
| V-07-2 | name | 禁止 `"` `\` `<` `>` `&` 与控制字符(U+0000–U+001F) | `名称不能包含 " \ < > & 等特殊字符` |
| V-07-3 | price | 必填;`^(0|[1-9]\d*)(\.\d{1,18})?$` 且解析后 `>0` | `请输入合法价格(如 0.01)` |
| V-07-4 | price | 上限 100 ETH(前端护栏,防误操作) | `价格超出上限(100 ETH)` |
| V-07-5 | poster | 必须从海报列表选择 1 张,或输入合法图片 URL | `请选择海报` |
| V-07-6 | resalePolicy | 必须为 0/1/2 之一 | `请选择转售策略` |
| V-07-7 | minStake | `0`(关闭)或 `≥ MIN_STAKE_FLOOR`(部署常量,建议 0.001 ETH) | `预存门槛须为 0 或 ≥ 0.001 ETH` |
| V-07-8 | 全部 | 校验未通过时 Publish 禁用;提交失败时聚焦首个错误字段 | — |

**`parseEthToWei` 规范**(必须实现,禁止 `parseFloat`):

```js
function parseEthToWei(input) {
  const m = /^(0|[1-9]\d*)(?:\.(\d{1,18}))?$/.exec(input.trim());
  if (!m) return null;                       // 非法格式
  const intPart = m[1];
  const frac = (m[2] ?? "").padEnd(18, "0");
  return BigInt(intPart) * 10n ** 18n + BigInt(frac);
}
```

**策略/门槛约束展示**:表单旁提示「开售后策略与门槛冻结」「0 表示不启用预存门槛」「预存冷却 {STAKE_COOLDOWN}」。**边界**:`price=0` 前端拦截(否则演出不可购,且合约无此 revert,见 §4.2);`minStake>0` 但低于地板→前端拦截并建议 ≥0.001 ETH。

**线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ 🎫 LivePass                                 ★ ORGANIZER 0x… │
│ ┌ 🎤 Publish a New Show ────────────────────────────────┐  │
│ │ [演出名称___________] [价格 ETH______]                │  │
│ │ 海报:[✓][ ][ ][ ][ ][ ][ ]                            │  │
│ │ 转售策略:(•)Closed  ( )Open  ( )Detect                │  │
│ │ 预存门槛:[0.002____] ETH(0 = 不启用;≥0.001 ETH)      │  │
│ │ 价格预览:0.01 ETH = 10000000000000000 wei             │  │
│ │                                       [Publish]        │  │
│ └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## 3.8 P-08 主办方 — 演出管理

**路由/守卫**:`/admin/shows`;需 owner。写函数:`setPrice`(C-02)、`openSale`/`closeSale`(C-03/C-04)。

| 编号 | 元素 | 文案/格式 | 交互 |
|---|---|---|---|
| E-08-1 | 顶栏 | `★ ORGANIZER` + 短地址 + Switch wallet | — |
| E-08-2 | 演出行 | 海报缩略 + 名称 + `#{id} · {price} ETH · {on sale/closed} · {nextTicketNo-1} sold` | — |
| E-08-3 | **规则状态** | `Resale: Closed/Open/Detect` + `Stake: 0.002 ETH` 或 `—` + `Rules: frozen`(开售后) | 只读 |
| E-08-3a | **转售策略编辑**(仅开售前) | 单选 `Closed` / `Open` / `Detect`;仅 `rulesFrozen=false` 时可编辑;开售后禁用并提示 `Rules are frozen after sale opens` | 选择后点保存 → `setResalePolicy(showId, policy)`(C-31) |
| E-08-3b | **预存门槛编辑**(开售前) | 输入 ETH;`0`=关闭,`>0` 须 ≥ `MIN_STAKE_FLOOR`;仅 `rulesFrozen=false` 时可编辑;开售后禁用并提示 `Rules are frozen after sale opens` | 保存 → `setStakeRequirement(showId, wei)`(C-32) |
| E-08-4 | Open/Close | `🚪 Open`(未开售可点)/`🔒 Close`(已开售可点) | 调 C-03/C-04 |
| E-08-5 | 调价 | `✏️ 调价`(仅 `saleOpen=false` 时可点;开售后隐藏或禁用) | 行内输入新价→`setPrice`;校验同 §3.7 |
| E-08-6 | 已售数 | `nextTicketNo-1`(**仅 UI 展示,与 AC-29 事件计数交叉校验**) | — |
| E-08-7 | 空态 | `No shows yet — publish your first one first.` | — |
| E-08-8 | 交易状态 | P-04(行内变体) | 提交后等待 receipt,解析 `PriceUpdated` / `ResalePolicyUpdated` / `StakeRequirementUpdated` / `SaleToggled` 后回读 `shows(showId)`;解析失败也回读一次(事件解析仅作加速) |

**关键规则**:①开售后 `rulesFrozen=true`,调价/规则编辑必须被前端禁用,且合约会 revert `"Rules are frozen after sale opens"`;②`setPrice(0)` 会让演出不可购,前端禁止;③`openSale` 后不能把策略改回;④调价仅影响之后 `buy()` 的金额(已售票成交价不变)。

**线框**:

```text
┌ 🎪 Manage Shows ───────────────────────────────────────────┐
│ [海报] Neon Nights Festival                                │
│        #0 · 0.01 ETH · on sale · 12 sold                   │
│        Resale: Closed · Stake: 0.002 ETH · Rules: frozen   │
│        [🔒 Close]  (调价已禁用:开售后冻结)                  │
│ [海报] Midnight Symphony                                   │
│        #1 · 0.008 ETH · closed · 0 sold                    │
│        Resale: Open · Stake: — · Rules: editable           │
│        [🚪 Open] [✏️ 调价]                                  │
└────────────────────────────────────────────────────────────┘
```

**依赖**:`shows`(C-13)、`setPrice`(C-02)、`openSale`/`closeSale`(C-03/C-04)、`setResalePolicy`(C-31)、`setStakeRequirement`(C-32);事件 `SaleToggled` / `PriceUpdated` / `ResalePolicyUpdated` / `StakeRequirementUpdated`。**策略/门槛编辑仅在 `rulesFrozen=false` 时显示,保存后按 E-08-8 解析事件并回读。**

## 3.9 P-09 验票面板(Check + Verify)

**路由/守卫**:`/admin/verify`;需 owner。读:`ownerOf`/`used`/`mintHolder`/`tokenShow`/`shows`/`provenance`;写:`verify`(C-08)。

| 编号 | 元素 | 说明 |
|---|---|---|
| E-09-1 | 板块标题 | `🚪 Verify at the Door` |
| E-09-2 | 演出号输入 | `Show #`(整数 ≥0) |
| E-09-3 | 票号输入 | `Ticket token #`(实际为 **tokenId**,整数 ≥1) |
| E-09-4 | Check 按钮 | `🔍 Check`(零 gas,只读) |
| E-09-5 | 预检结果面板 | Token #、Show #+名称、Holder、USED/UNUSED、策略判定、首次买家、票号 |
| E-09-6 | **策略判定行** | Closed:`Resale restricted`;Open:`Admissible (resold allowed)`;Detect:持有人 ≠ 首次买家 → `RESOLD — deny entry`(红) |
| E-09-7 | Verify 按钮 | 主按钮;仅在 Check 通过且输入未变、未使用、策略放行时可点;需 ConfirmDialog「永久打标,不可撤销」 |
| E-09-8 | 已验票计数 | `VERIFIED THIS SHOW` + 该场 `TicketVerified` 事件计数(AC — 见 §7 TC;不新增 AC) |
| E-09-9 | 成功提示 | `✅ Ticket #N verified — ADMIT`;面板转 USED;按钮禁用 |
| E-09-10 | 错误行 | `Token #x 不存在` / `USED — deny entry` / `RESOLD — deny entry` / revert 原文 |

**Check 算法(零 gas)**:

```text
并行 eth_call:ownerOf(tokenId)、used(tokenId)、tokenShow(tokenId)、shows(showIdChain)、mintHolder(tokenId)
展示:holder、USED/UNUSED、该票属于哪个演出、首次买家、策略判定(Closed/Open/Detect + 是否 resold)
若 input.showId ≠ tokenShow → 红字「该票属于演出 #x,verify 将被拒绝」;不发起任何交易
```

**Verify 前置条件**:①Check 通过且输入未变;②`tokenShow==showId`;③`used==false`;④当前钱包 owner;⑤策略放行(Detect 下 `ownerOf==mintHolder`)。**失败映射**:`"Ticket does not belong to this show"`、`"Ticket already used"`、`"Resale not permitted"`、`OwnableUnauthorizedAccount`。

**线框**:

```text
┌ 🚪 Verify at the Door ─────────────────────────────────────┐
│ [Show #__] [Ticket token #__]  [🔍 Check]  [🎟️ Verify]    │
│ ┌ 预检结果 ────────────────────────────────────────────┐  │
│ │ Token #1 · Show #0 · Neon Nights Festival             │  │
│ │ Holder 0x… · First buyer 0x… · Ticket #1              │  │
│ │ 状态:◈ UNUSED — admit    Resale: Closed → admissible  │  │
│ └───────────────────────────────────────────────────────┘  │
│ 已验票数:12(该场 TicketVerified 计数)                      │
└────────────────────────────────────────────────────────────┘
```

## 3.10 P-10 票房与提现

**路由/守卫**:`/admin/revenue`;需 owner。数据:**四块口径**(AC-29):①演出数=`showCount()`;②售票数=`TicketBought` 事件计数;③累计成交额=Σ`TicketBought.price`;④可提现=`getBalance(合约)`(**票款部分**;stake 池不可提,见 §4.9)。

| 编号 | 元素 | 文案/格式 | 数据来源 |
|---|---|---|---|
| E-10-1 | 演出数 | `SHOWS PUBLISHED` + 整数 | C-12 |
| E-10-2 | 售票数 | `TICKETS SOLD` + `TicketBought` 事件计数(部署区块起分块;禁止 latest-N) | 事件 |
| E-10-3 | 累计成交额 | `TOTAL SALES` + `Σ TicketBought.price`(事件口径;提现不影响) | 事件 |
| E-10-4 | 可提现余额 | `WITHDRAWABLE` + 合约中**票款**余额 | C-24 + 合约 `ticketRevenue` 读数(若有) |
| E-10-5 | 每场概览 | `#id · 已售 N · 当前价 P · 策略 · 审批冻结状态`;`N=nextTicketNo-1` 仅展示 | C-13 |
| E-10-6 | 提现按钮 | `💰 Withdraw Revenue`;余额=0 或非 owner 禁用 | C-09 |
| E-10-7 | 确认对话框 | `确认提现 {amount} ETH 到 {owner}?` | — |
| E-10-8 | 交易结果 | P-04;成功后重读余额与统计 | — |

**关键规则**:①事件计数为验收判据(AC-29),须从部署区块分块;事件查询不可用时标注「估算」并登记环境限制;②`nextTicketNo-1`/`price×N` 仅 UI 交叉校验;③提现只提取票款,**不得提取 stake 池**(见 §4.9 / §10 风险);④`withdraw()` 成功后合约票款余额归零,累计成交额不变。

**线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ ┌ SHOWS PUBLISHED ┐ ┌ TICKETS SOLD ┐ ┌ TOTAL SALES ─────┐  │
│ │        3        │ │  20(事件计数)│ │  0.15 ETH(Σ价)   │  │
│ └─────────────────┘ └──────────────┘ └──────────────────┘  │
│ ┌ WITHDRAWABLE(票款,不含保证金池)───────────────────────┐  │
│ │ 0.05 ETH                        [💰 Withdraw Revenue]   │  │
│ └─────────────────────────────────────────────────────────┘  │
│ #0 Neon Nights · 12 sold · 0.01 ETH · Resale:Closed         │
│ #1 Midnight Sym · 3 sold · 0.008 ETH · Resale:Open          │
└────────────────────────────────────────────────────────────┘
```

## 3.11 P-11 全局状态与提示组件

| 组件 | 触发 | 行为 | 验收 |
|---|---|---|---|
| `NetworkBanner` | `chainId !== 11155111` | 顶部横幅 + `[切换到 Sepolia]`;失败→错误 + 重试;非目标链禁用写按钮 | AC-13 |
| `ErrorState` | 读失败/超时 | 错误文案 + `Retry`;保留上次数据可选 | AC-23 |
| `EmptyState` | 无数据 | 图标 + 标题 + 说明 + CTA | AC-22 |
| `LoadingSkeleton` | 首次加载 | 骨架块 | AC-15 |
| `Toast` | 账户/网络切换 | 「钱包账户已切换,数据已刷新」/「已切换到 Sepolia」 | AC-13/14 |
| `ConfirmDialog` | 危险动作(验票/提现/调价/开售) | 标题+影响说明+取消/确认;Esc 关闭;焦点圈定 | TC-12 |
| `NotFound` | 未知路由 | 「页面不存在」+ 回首页 | TC-01 |

**错误文案表**:MetaMask 未安装、用户拒绝(4001,中性「已取消」)、余额不足、网络错误/超时、RPC 限流、非 Sepolia、链未添加(4902 自动 add)、revert 原文 + 中文解释、未知错误截断 200 字。**硬性**:revert 原文必须原样显示(AC-27);非目标链禁用写操作;任何读失败必须有可见错误态(AC-23)。

## 3.12 P-12 预存与购票资格

**路由/守卫**:`/stake`;需已连接。读写:`stakeOf`、`stakeSince`、`shows`、`stake()`、`unstake()`。

| 编号 | 元素 | 文案/格式 | 数据来源 |
|---|---|---|---|
| E-12-1 | 当前预存 | `YOUR STAKE` + `{formatEther(stakeOf)} ETH` | C-22 |
| E-12-2 | 冷却状态 | `Ready`(绿)/`Cooling down: mm:ss`(琥珀,倒计时至 `stakeSince + STAKE_COOLDOWN`) | C-23 + 常量 |
| E-12-3 | 门槛说明 | 按演出列出:`#id 名称 · 需预存 {minStake} ETH`(仅 `minStake>0`);`—` 表示该场无须预存 | C-13 |
| E-12-4 | 存入金额输入 | ETH,`>0`;`parseEthToWei` 解析;按钮 `💳 Stake` | — |
| E-12-5 | 取回金额输入 | ETH,`>0` 且 ≤ `stakeOf`;按钮 `↩️ Unstake` | — |
| E-12-6 | 资格提示 | 若某场门槛 > 当前预存:`还差 {diff} ETH` + 去购票按钮禁用提示 | 计算 |
| E-12-7 | 交易状态 | P-04;成功后重读 `stakeOf`/`stakeSince` | — |
| E-12-8 | 空态 | 尚未预存:`You have not staked yet — staking is optional unless a show requires it.` | C-22=0 |

**交互**:

```text
[Stake] → 校验 amount>0 → stake({ value: amount })(C-05)→ 成功:stakeOf += amount、stakeSince=now;提示「已预存,冷却 STAKE_COOLDOWN 后可用于购票」
[Unstake] → 校验 0<amount≤stakeOf → unstake(amount)(C-06)→ 成功:stakeOf -= amount、转账到钱包
说明:预存不是购票款;购票需另付票价;预存可随时取回(不影响已购票)
```

**空/错误态**:未连接→P-01;无预存→E-12-8;金额非法/超余额→前端拦截;`"Stake must be positive"`/`"Insufficient stake"` → P-04 原文 + 中文解释;RPC 失败→P-11。

**线框**:

```text
┌────────────────────────────────────────────────────────────┐
│ 💳 Stake & Eligibility                                     │
│ YOUR STAKE: 0.004 ETH        Status: Cooling down 03:20    │
│ 门槛演出:                                                  │
│  #0 Neon Nights · 需预存 0.002 ETH(已满足)                │
│  #2 Starlight Rave · 需预存 0.003 ETH(已满足)             │
│ 存入:[0.002____] ETH [💳 Stake]   取回:[0.001____] ETH [↩️ Unstake] │
└────────────────────────────────────────────────────────────┘
```

---
# 4. 合约接口契约(目标接口)

> **性质**:本章是**待实现的目标接口**,供 P1 实现;不是既有 ABI。签名与参数以 canon §8 为准,语义不得改变;若实现微调签名(如增加 `uint8` 常量 getter),必须在 README 记录差异。
> **来源**:`canon.md` v2.0 §8(逐字 revert/事件)+ §6(状态机/策略)+ §4(F-15/F-27/F-28)。

## 4.1 合约概况与继承

| 项 | 目标值 |
|---|---|
| 合约名 | `LivePass` |
| 继承 | `ERC721`(OpenZeppelin Contracts 5.x)+ `Ownable` + `Base64`/`Strings` 工具库 |
| 构造函数 | `constructor() ERC721("LivePass Concert Ticket", "LIVEPASS") Ownable(msg.sender)`(无参数;部署者 = 主办方) |
| Solidity | `^0.8.20`;部署前锁定编译版本并写入 README |
| 无以下能力 | 无代理升级、无暂停、无白名单、无退款、无二级市场撮合(见 §1.3) |
| 合约职责 | 演出与规则(策略/门槛)· 预存 · 购票 · 验票 · 溯源 · 链上 SVG 票面 · 票款提现 |

## 4.2 状态变量与数据结构(目标)

```solidity
enum ResalePolicy { Closed, Open, Detect }   // 0 / 1 / 2

struct Show {
    string       name;
    string       poster;         // data URI 或 URL
    uint256      price;          // wei
    bool         saleOpen;
    bool         rulesFrozen;    // openSale 后冻结策略与门槛
    ResalePolicy resalePolicy;
    uint256      minStake;       // 0 = 关闭预存门槛
    uint256      nextTicketNo;   // 本场票号,从 1 开始
}

mapping(uint256 => Show) public shows;
mapping(address => mapping(uint256 => bool))    public hasBought;   // 钱包 => showId => 是否已购
mapping(address => mapping(uint256 => uint256)) public ticketOf;    // 钱包 => showId => 票号
mapping(uint256 => uint256) public tokenShow;      // tokenId => showId
mapping(uint256 => address) public mintHolder;     // tokenId => 首次买家(F-28)
mapping(uint256 => bool)    public used;           // tokenId => 已验票
mapping(address => uint256) public stakeOf;        // 钱包 => 预存额(F-27)
mapping(address => uint256) public stakeSince;     // 钱包 => 最近存入时间(冷却判定)
mapping(uint256 => address) public issuer;         // showId => 发行方(F-28)
mapping(uint256 => uint256) public mintedAt;       // tokenId => 铸造时间(F-28)

uint256 public showCount;
uint256 public ticketRevenue;     // 票款池(可提现);与 stake 池隔离(§4.9)
uint256 public totalStaked;       // 保证金池总额(不可被 owner 提取;§4.9)

uint256 private _nextTokenId = 1; // 全局 tokenId,从 1 自增
```

**扩展说明(必须与 canon 语义一致)**:`issuer`/`mintedAt` 为 F-28 溯源所需;`ticketRevenue`/`totalStaked` 为 F-04 与资金隔离所需(见 §4.9)。以上扩展只增加只读视图/不变量,不改变 canon §8 的任何函数语义;如 P1 认为需要调整,须在技术方案中列出并由 P4 同步验收口径。

## 4.3 写函数表 C-01…C-11 + C-31/C-32(逐字 revert/事件)

> **编号说明**:C-01…C-11 为购票主链路写函数;C-31/C-32 为开售前规则 setter(追加编号,保持既有 C 编号稳定);读函数见 §4.4。

> 写函数 = 发交易、花 gas、需 MetaMask 签名。**写函数的 Solidity 返回值不会返回给交易发送方**;前端必须解析 `receipt.logs`(§6.2.3)。

### C-01 `createShow` — 发布演出(含策略与门槛)

| 项 | 内容 |
|---|---|
| 签名(目标) | `function createShow(string name, string poster, uint256 price, uint8 resalePolicy, uint256 minStake) external onlyOwner returns (uint256 showId)` |
| 参数 | `name` 演出名;`poster` 海报(data URI/URL);`price` 单价(wei);`resalePolicy` 0/1/2 = Closed/Open/Detect;`minStake` 预存门槛(wei,0=关闭) |
| 返回 | `uint256 showId`(交易方拿不到返回值,须解析 `ShowCreated`) |
| 权限 | `onlyOwner`;非 owner → `OwnableUnauthorizedAccount(address)` |
| revert(逐字) | `"Invalid resale policy"`(policy > 2) |
| 触发事件 | `ShowCreated(uint256 indexed showId, string name, string poster, uint256 price, uint8 resalePolicy, uint256 minStake)` |
| 状态变化 | `showId = showCount`;`showCount += 1`;`shows[showId] = Show(name,poster,price,false,false,policy,minStake,1)`;`issuer[showId] = msg.sender` |
| 边界 | ①`price` 无合约校验 → 前端必须拦截 0(否则演出不可购);②`minStake` 若 >0 建议前端强制 ≥ `MIN_STAKE_FLOOR`(合约是否校验见 OQ-05,当前接口不新增 revert);③创建后 `saleOpen=false`、`rulesFrozen=false` |
| UI | P-07;前置校验 V-07(§3.7) |

### C-02 `setPrice` — 调价(仅开售前)

| 项 | 内容 |
|---|---|
| 签名 | `function setPrice(uint256 showId, uint256 newPrice) external onlyOwner` |
| revert(逐字) | `"Rules are frozen after sale opens"`(`rulesFrozen == true`);仅 owner 权限错误同上 |
| 触发事件 | `PriceUpdated(uint256 indexed showId, uint256 newPrice)` |
| 状态变化 | `shows[showId].price = newPrice` |
| 边界 | ①开售后冻结,任何调价 revert;②`newPrice=0` 会让演出不可购 → 前端禁止;③无存在性校验时不得对越界 id 调用(前端只允许列表内) |
| UI | P-08(开售后隐藏/禁用) |

### C-03 `openSale` / C-04 `closeSale` — 开售 / 停售

| 项 | C-03 `openSale` | C-04 `closeSale` |
|---|---|---|
| 签名 | `function openSale(uint256 showId) external onlyOwner` | `function closeSale(uint256 showId) external onlyOwner` |
| revert | 无新增 revert(仅权限) | 无新增 revert(仅权限) |
| 触发事件 | `SaleToggled(uint256 indexed showId, bool open)`(`open=true`) | `SaleToggled(showId, false)` |
| 状态变化 | `saleOpen=true`;**`rulesFrozen=true`**(策略与门槛冻结) | `saleOpen=false`;`rulesFrozen` 保持 true |
| 边界 | 重复开售幂等(重复发事件);开售后策略/门槛/票价均不可改 | 停售不影响已售票与验票;可重新开售(规则仍冻结) |
| UI | P-08 `Open`/`Close` 按钮 | 同左 |

### C-05 `stake` — 预存保证金(F-27)

| 项 | 内容 |
|---|---|
| 签名 | `function stake() external payable` |
| 参数 | `msg.value > 0` |
| revert(逐字) | `"Stake must be positive"`(`msg.value == 0`) |
| 触发事件 | `Staked(address indexed fan, uint256 amount, uint256 total)` |
| 状态变化 | `stakeOf[msg.sender] += msg.value`;`stakeSince[msg.sender] = block.timestamp`;`totalStaked += msg.value` |
| 边界 | ①可多次存入,每次存入刷新 `stakeSince`(冷却从最近一次存入起算);②保证金不产生收益、不参与购票支付;③任何人可预存,不强制先购票 |
| UI | P-12 `💳 Stake` |

### C-06 `unstake` — 取回保证金

| 项 | 内容 |
|---|---|
| 签名 | `function unstake(uint256 amount) external` |
| revert(逐字) | `"Insufficient stake"`(`amount > stakeOf[msg.sender]` 或 `amount == 0` 按实现约定,建议 `amount==0` 走同一文案) |
| 触发事件 | `Unstaked(address indexed fan, uint256 amount)` |
| 状态变化 | `stakeOf[msg.sender] -= amount`;`totalStaked -= amount`;`payable(msg.sender).transfer(amount)`(或 `call`,见 §8.2.3) |
| 边界 | ①取回后不影响已购票(票已付清);②若某场要求门槛,取回后可能不再满足购票资格(购票时校验);③冷却中仍可取回(冷却只限制「用该笔保证金购票」) |
| UI | P-12 `↩️ Unstake` |

### C-07 `buy` — 购票(原子结算 + 限购 + 预存门槛)

| 项 | 内容 |
|---|---|
| 签名 | `function buy(uint256 showId) external payable returns (uint256 tokenId)` |
| 参数 | `showId`;`msg.value` 必须精确等于 `shows[showId].price` |
| revert(逐字,按实现顺序) | ①`"Sale is not open"` ②`"One ticket per wallet"` ③`"Send the exact ticket price"` ④`"Insufficient stake"`(`minStake>0` 且 `stakeOf < minStake`)⑤`"Stake cooling down"`(`minStake>0`、预存达标,但 `block.timestamp < stakeSince + STAKE_COOLDOWN`) |
| 触发事件 | `TicketBought(uint256 indexed showId, address indexed buyer, uint256 indexed tokenId, uint256 price)`;**`TicketIssued(uint256 indexed showId, uint256 indexed tokenId, address indexed issuer, address buyer)`(与 `TicketBought` 同笔交易发出)** |
| 状态变化 | `tokenId=_nextTokenId++`;`hasBought[msg.sender][showId]=true`;`ticketOf[msg.sender][showId]=show.nextTicketNo++`;`tokenShow[tokenId]=showId`;`mintHolder[tokenId]=msg.sender`;`mintedAt[tokenId]=block.timestamp`;`ticketRevenue += price`;`_safeMint(msg.sender, tokenId)` |
| 边界 | ①超付/少付都 revert(无找零);②预存门槛与冷却只在该场 `minStake>0` 时校验;③保证金**不抵扣票价**(另付);④不限制总量、不限制转售(策略在转移/验票处生效);⑤`_safeMint` 对合约钱包会回调 `onERC721Received`,拒绝则 revert `ERC721InvalidReceiver` |
| UI | P-03(预检与引导 P-12) |

### C-08 `verify` — 验票(永久打标 + 策略判定)

| 项 | 内容 |
|---|---|
| 签名 | `function verify(uint256 showId, uint256 tokenId) external onlyOwner returns (bool)` |
| 权限 | `onlyOwner`(**本期场馆 = 主办方钱包**) |
| revert(逐字,按实现顺序) | ①`"Ticket does not belong to this show"` ②`"Ticket already used"` ③`"Resale not permitted"`(Detect 策略且 `ownerOf(tokenId) != mintHolder[tokenId]`) |
| 触发事件 | `TicketVerified(uint256 indexed showId, uint256 indexed tokenId, address indexed venue)` |
| 状态变化 | `used[tokenId] = true`(永久,无重置) |
| 边界 | ①Closed 策略下转移被阻止,持有人恒为首次买家,不会触发 ③;②Open 策略下任何持有人可入场;③Detect 策略下转售后拒绝入场;④已验票后再转手的票面不一致(§4.6 边界 2),建议禁止验票后转移(见 §10 R-04) |
| UI | P-09(须先 Check) |

### C-09 `withdraw` — 提现票款(不含保证金池)

| 项 | 内容 |
|---|---|
| 签名 | `function withdraw() external onlyOwner` |
| revert | 仅权限错误;余额为 0 时按实现约定可 revert 或 no-op(建议 revert `"Nothing to withdraw"` 需与 canon 同步,见 OQ-06) |
| 触发事件 | `Withdrawn(address indexed to, uint256 amount)` |
| 状态变化 | `amount = ticketRevenue`;`ticketRevenue = 0`;`payable(owner()).transfer(amount)`(或 `call`) |
| 边界 | ①**只提取票款**,`totalStaked` 部分不得被 owner 提取(§4.9 不变量);②提现给当前 `owner()`;③累计成交额(事件口径)不受提现影响 |
| UI | P-10 |

### C-10 `transferFrom` / C-11 `safeTransferFrom` — 转售策略拦截

| 项 | 内容 |
|---|---|
| 签名 | `function transferFrom(address from, address to, uint256 tokenId) public`;`function safeTransferFrom(address from, address to, uint256 tokenId)` / `safeTransferFrom(address,address,uint256,bytes)` |
| 实现要点 | 重写 OpenZeppelin Contracts 5.x 的 `_update(address to, uint256 tokenId, address auth)`(或等价钩子),在**非铸造(from==0)且策略为 Closed** 时 revert `"Resale not permitted"` |
| revert(逐字) | `"Resale not permitted"`(Closed 策略下的任何转移) |
| 触发事件 | `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`(ERC-721 标准) |
| 状态变化 | Open/Detect:所有权变更;`used`/`mintHolder` 不变;Closed:拒绝(状态不变) |
| 边界 | ①Closed 策略下 `approve` 仍可用但转移必失败;②Open/Detect 均允许转移;**转售价格不受合约约束**(限价属 F-16 后续);③前端不提供转移入口,转移通过钱包/Etherscan/脚本执行 |
| UI | 无(展示见 P-05/P-06) |

### C-31 `setResalePolicy` — 开售前调整转售策略(F-15)

| 项 | 内容 |
|---|---|
| 签名 | `function setResalePolicy(uint256 showId, uint8 resalePolicy) external onlyOwner` |
| revert(逐字) | `"Rules are frozen after sale opens"`(`rulesFrozen==true`);`"Invalid resale policy"`(policy>2) |
| 触发事件 | `ResalePolicyUpdated(uint256 indexed showId, uint8 resalePolicy)` |
| 状态变化 | `shows[showId].resalePolicy = ResalePolicy(resalePolicy)` |
| 边界 | 仅开售前可改;不改变已售票;开售后冻结(AC-33);前端 P-08 仅在 `rulesFrozen=false` 时显示入口 |
| UI | P-08(开售前) |


### C-32 `setStakeRequirement` — 开售前调整预存门槛(F-27)

| 项 | 内容 |
|---|---|
| 签名 | `function setStakeRequirement(uint256 showId, uint256 minStake) external onlyOwner` |
| revert(逐字) | `"Rules are frozen after sale opens"`(`rulesFrozen==true`) |
| 触发事件 | `StakeRequirementUpdated(uint256 indexed showId, uint256 minStake)` |
| 状态变化 | `shows[showId].minStake = minStake`(0 = 关闭) |
| 边界 | 仅开售前可改;开售后冻结(AC-33);`minStake>0` 建议 ≥ `MIN_STAKE_FLOOR`(前端校验,OQ-05);不改变已存入的 `stakeOf` |
| UI | P-08(开售前) |

## 4.4 读函数表 C-12…C-30(免费 `eth_call`)

| 编号 | 签名 | 返回 | 语义/边界 | 前端用途 |
|---|---|---|---|---|
| C-12 | `showCount() view returns (uint256)` | 演出总数 | id 从 0 开始 | P-02/P-05/P-08/P-10 |
| C-13 | `shows(uint256) view returns (string name,string poster,uint256 price,bool saleOpen,bool rulesFrozen,uint8 resalePolicy,uint256 minStake,uint256 nextTicketNo)` | 演出结构 | 不存在 id 返回空结构 | 全页 |
| C-14 | `owner() view returns (address)` | 主办方 | Ownable;转移所有权后变化 | P-01 角色判定/P-10 |
| C-15 | `ownerOf(uint256) view returns (address)` | 当前持有人 | 不存在 token → OZ `ERC721NonexistentToken` | P-05/P-06/P-09 |
| C-16 | `hasBought(address,uint256) view returns (bool)` | 是否已购 | **仅代表购买记录**,不随转移变化;不可作为当前持有判据(AC-19) | P-03 已购提示 |
| C-17 | `mintHolder(uint256) view returns (address)` | 首次买家 | 溯源/策略判定 | P-06/P-09 |
| C-18 | `used(uint256) view returns (bool)` | 是否已验 | 不存在 token 返回 false | P-05/P-06/P-09 |
| C-19 | `ticketOf(address,uint256) view returns (uint256)` | 票号(按演出) | 未购返回 0;受让票恒 0 → 前端显示 `—` | P-05/P-06 |
| C-20 | `tokenURI(uint256) view returns (string)` | `data:application/json;base64,…` | 不存在 token → `ERC721NonexistentToken`;含 name/description/image(base64 SVG) | P-06 |
| C-21 | `provenance(uint256) view returns (address issuer, address firstBuyer, address currentHolder, uint256 mintedAt, bool used)` | 溯源 5 元组 | 不存在 token 建议 revert `ERC721NonexistentToken`;实现读 `mintHolder`+`tokenShow`+`shows[showId]` 并与 `TicketIssued` 一致 | P-06/P-09/证据 EV-8 |
| C-22 | `stakeOf(address) view returns (uint256)` | 预存额 | 未预存返回 0 | P-03/P-12 |
| C-23 | `stakeSince(address) view returns (uint256)` | 最近存入时间 | 未预存返回 0;用于冷却倒计时 | P-03/P-12 |
| C-24 | `provider.getBalance(contract)`(**非合约函数,仅前端取数,不占 ABI 编号**) | 合约 ETH 余额 | 票款 + 保证金池 | P-10(可提现=`ticketRevenue`,C-26;余额仅作不变量核对) |
| C-25 | `tokenShow(uint256) view returns (uint256)` | 所属 showId | 不存在 token 返回 0(与 showId 0 混淆,需配合 ownerOf) | P-06/P-09 |
| C-26 | `ticketRevenue() view returns (uint256)` | 票款池 | 可提现金额;与 `totalStaked` 隔离 | P-10 |
| C-27 | `STAKE_COOLDOWN() view returns (uint256)`、`MIN_STAKE_FLOOR() view returns (uint256)` | 常量 | 冷却秒数/门槛地板(wei) | P-03/P-07/P-12 显示 |
| C-28 | `name()`/`symbol()`/`balanceOf(address)`/`supportsInterface(bytes4)` | ERC-721 元数据/余额 | 展示/AC-01 | P-06/页脚/验收 |
| C-29 | `issuer(uint256 showId) view returns (address)` | 演出发行方 | `createShow` 的 msg.sender;用于溯源展示 | P-06/AC-38 |
| C-30 | `mintedAt(uint256 tokenId) view returns (uint256)` | 铸造时间 | `buy()` 时写入;与区块时间一致;**canon 扩展(Lead 已并入 §8)** | P-06/AC-38 |

## 4.5 事件表(逐字对齐 canon §8)

| 事件 | 完整签名 | 索引字段 | 触发函数 | 前端用途 |
|---|---|---|---|---|
| `ShowCreated` | `event ShowCreated(uint256 indexed showId, string name, string poster, uint256 price, uint8 resalePolicy, uint256 minStake)` | showId | C-01 | 解析新 showId;P-07 成功提示 |
| `PriceUpdated` | `event PriceUpdated(uint256 indexed showId, uint256 newPrice)` | showId | C-02 | P-08 调价回读/通知 |
| `ResalePolicyUpdated` | `event ResalePolicyUpdated(uint256 indexed showId, uint8 resalePolicy)` | showId | C-31 | P-08 策略变更通知/回读 |
| `StakeRequirementUpdated` | `event StakeRequirementUpdated(uint256 indexed showId, uint256 minStake)` | showId | C-32 | P-08 门槛变更通知/回读 |
| `SaleToggled` | `event SaleToggled(uint256 indexed showId, bool open)` | showId | C-03/C-04 | P-08 状态刷新 |
| `Staked` | `event Staked(address indexed fan, uint256 amount, uint256 total)` | fan | C-05 | P-12 预存成功/统计 |
| `Unstaked` | `event Unstaked(address indexed fan, uint256 amount)` | fan | C-06 | P-12 取回成功 |
| `TicketBought` | `event TicketBought(uint256 indexed showId, address indexed buyer, uint256 indexed tokenId, uint256 price)` | showId/buyer/tokenId | C-07 | 解析 tokenId;P-10 售票数/成交额(AC-29) |
| `TicketIssued` | `event TicketIssued(uint256 indexed showId, uint256 indexed tokenId, address indexed issuer, address buyer)` | showId/tokenId/issuer | C-07(与 `TicketBought` 同 tx) | **F-28 发行事件**:`issuer` = show 创建者(`createShow` 的 msg.sender),`buyer` = 首次买家;供溯源展示与校验 |
| `TicketVerified` | `event TicketVerified(uint256 indexed showId, uint256 indexed tokenId, address indexed venue)` | showId/tokenId/venue | C-08 | P-09 计数/状态 |
| `Withdrawn` | `event Withdrawn(address indexed to, uint256 amount)` | to | C-09 | P-10 提现记录 |
| `Transfer`(继承) | `event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)` | 全部 | 铸造/转移 | **P-05 按所有权枚举的唯一来源**;溯源(AC-38) |
| `Approval`/`ApprovalForAll`/`OwnershipTransferred`(继承) | ERC-721/Ownable 标准 | — | 授权/所有权 | 不使用(监控可选) |

**事件纪律**:①`queryFilter` 必须显式传 `fromBlock`(部署区块起分块,§6.3);②事件是通知/索引,状态展示必须回读 `ownerOf`/`used`/`provenance`;③`TicketBought.price` 是成交价(调价后不同);④`TicketIssued` 与 `TicketBought` 同 tx 发出,`provenance()` 实现可读 `mintHolder`+`tokenShow`+`shows[showId]` 并与 `TicketIssued` 校验一致性(canon §4 F-28/§8)。

## 4.6 票面状态机 S0 / S0' / S1 / S2 与三策略(canon §6 唯一口径)

### 4.6.1 状态定义

| 状态 | 票面文案 | 判据 | 入场 | 可达策略 |
|---|---|---|---|---|
| **S0** | `UNUSED · VALID` | 未验票,当前持有人 = 首次买家 | ✅ | Closed / Open |
| **S0'** | `TRANSFERRED · ADMISSIBLE` | 未验票,当前持有人 ≠ 首次买家 | ✅ | Open |
| **S1** | `VERIFIED · ADMIT` | 已验票(`used=true`) | 已入场 | 全部 |
| **S2** | `RESOLD · NOT ADMISSIBLE` | 未验票,当前持有人 ≠ 首次买家 | ❌ `verify` revert | Detect |

### 4.6.2 迁移表

| 迁移 | 触发 | 前置 | 后置 | 事件 | 说明 |
|---|---|---|---|---|---|
| T1 铸造 | `buy()` 成功 | — | S0 | `TicketBought` | 铸造给买家;`mintHolder` 记录 |
| T2 验票 | `verify()` 成功 | S0/S0'(可入场态) | S1 | `TicketVerified` | `used=true` 永久 |
| T3 转售(Open) | ERC-721 转移 | S0;策略 Open | S0' | `Transfer` | 持有人变,可入场;`mintHolder` 不变 |
| T4 转售(Detect) | ERC-721 转移 | S0;策略 Detect | S2 | `Transfer` | 票面转红,`verify` 拒绝 |
| T5 转售(Closed) | ERC-721 转移尝试 | 任意 | 拒绝 | — | revert `"Resale not permitted"` |
| T6 转回首次买家(Open/Detect) | 转移回 `mintHolder` | S0'/S2 | S0/S1(已验则 S1) | `Transfer` | 已知边界(§4.6.3 第 2 条) |

### 4.6.3 必须披露的设计边界(canon §6)

1. **Closed 只在合约层阻止转移**;链下私下交易(卖出钱包私钥/助记词)无法阻止 —— 身份层缺口(§11 A 类 F-18 建议项);
2. **Detect 是「允许转手但拒绝入场」**;存在「已验票后再转手」的票面不一致(票面 S2 但已入场),建议实现禁止验票后转移(见 §10 R-04 / OQ-04);
3. **策略与预存门槛在开售后冻结**,避免商家临时改规则影响已购票者;
4. **Open/Detect 下票价不受约束**:限价属 F-16(后续),本期不承诺。

## 4.7 revert 文案总表与前端映射(逐字)

> **纪律**:前端必须原样显示 revert 原文(AC-27),中文解释只作附加;不得用「交易失败」掩盖合约原因。

| # | revert 原文 | 类型 | 触发 | 中文解释 | 覆盖 AC |
|---|---|---|---|---|---|
| Rv-1 | `"Invalid resale policy"` | require | `createShow`/`setResalePolicy` 的 policy>2 | 转售策略参数非法 | AC-30…AC-33 |
| Rv-2 | `"Rules are frozen after sale opens"` | require | 开售后调用 `setPrice`/`setResalePolicy`/`setStakeRequirement` | 开售后规则冻结,不可修改 | AC-33 |
| Rv-3 | `"Sale is not open"` | require | `buy` 时 `saleOpen=false` | 该演出尚未开售或已停售 | AC-02 |
| Rv-4 | `"One ticket per wallet"` | require | `hasBought[wallet][showId]` | 该钱包已购买本场演出的一张票 | AC-06 |
| Rv-5 | `"Send the exact ticket price"` | require | `msg.value != price` | 支付金额须精确等于票价(无找零) | AC-04 |
| Rv-6 | `"Insufficient stake"` | require | `buy` 预存不足;`unstake` 超余额 | 预存不足(购票或取回) | AC-34/AC-35 |
| Rv-7 | `"Stake cooling down"` | require | `buy` 时冷却未满 | 预存冷却中,暂不可用于购票 | AC-37 |
| Rv-8 | `"Stake must be positive"` | require | `stake` msg.value=0 | 预存金额必须大于 0 | AC-35 |
| Rv-9 | `"Ticket does not belong to this show"` | require | `verify` 场次不匹配 | 该票不属于输入的演出 | AC-27 |
| Rv-10 | `"Ticket already used"` | require | `verify` 已验票 | 该票已入场,不可重复使用 | AC-08 |
| Rv-11 | `"Resale not permitted"` | require | Closed 下转移;Detect 下验票 | 该票按商家策略不可转售/不可入场 | AC-30/AC-32 |
| Rv-12 | `OwnableUnauthorizedAccount(address)` | 自定义 error | 非 owner 调用 onlyOwner | 当前钱包不是主办方,无权限 | AC-09 |
| Rv-13 | `ERC721NonexistentToken(uint256)` | 自定义 error | 查询/展示不存在的 token | 票不存在 | AC-27 |
| Rv-14 | `ERC721InvalidReceiver(address)` / `ERC721InsufficientApproval` 等 OZ 错误 | 自定义 error | 铸造/转移边界 | NFT 接收/授权失败 | TC 边界 |

**解码规范(ethers v6)**:优先 `err.reason`(require string)→ `err.revert?.args`(自定义 error)→ 从 `shortMessage` 正则提取;`ACTION_REJECTED`/4001 映射为中性「已取消交易」;未识别错误显示截断 message(≤200 字)+ 控制台完整错误。

## 4.8 实现顺序(先最小闭环,后策略与门槛)

| 阶段 | 内容 | 完成标准 |
|---|---|---|
| **I1 最小闭环** | 合约骨架(ERC721+Ownable)、`createShow`(仅 name/poster/price,策略/门槛参数先固定默认)、`openSale/closeSale`、`buy`、`verify`、`withdraw`、`tokenURI`(S0/S1 两态) | 能在 Sepolia 完成购票→验票→提现闭环;AC-01…AC-14 与 AC-18…AC-29 相关项可测 |
| **I2 策略与门槛** | `ResalePolicy` 三策略 + `_update` 拦截 + S0'/S2 票面 + `stake/unstake` + 冷却 + 规则冻结 + 开售前 setter(`setResalePolicy`/`setStakeRequirement`)+ `PriceUpdated`/`ResalePolicyUpdated`/`StakeRequirementUpdated` | AC-30…AC-37 可测 |
| **I3 溯源与完善** | `issuer/mintHolder/mintedAt/provenance` + SVG 展示发行方/首次买家/当前持有人 + `Withdrawn`/`Staked` 事件完整 + 前端 P-12/P-05/P-06 溯源展示 | AC-38/AC-39 可测;EV-8/EV-9 可产出 |
| 并行 | 前端 I1 起即可用 mock 数据开发(P2),P3 同步接 ABI;P4 在 I1 后开始 AC 执行 | — |

> **接口冻结**:I1 开始前冻结 `contracts/(合约源码文件)` 的函数签名与事件(按 §4.3/§4.5);I2/I3 只允许新增只读函数/事件或 `_update` 内部实现,不得修改已冻结签名(避免前端返工)。

## 4.9 资金隔离与提现设计(必须实现)

**问题**:合约同时持有①票款(应可被 owner 提取)与②保证金池(属于观众,owner 不得提取)。若 `withdraw()` 直接转 `address(this).balance`,会挪用保证金。

**目标设计**:

```text
不变量(canon §8,必须实现):address(this).balance == ticketRevenue + totalStaked
        须在 stake / unstake / buy / verify / withdraw 每类操作后成立(Foundry 不变量测试覆盖)
- buy():  ticketRevenue += price
- stake(): totalStaked += msg.value
- unstake(): totalStaked -= amount;stakeOf[msg.sender] -= amount;转账 amount
- withdraw(): amount = ticketRevenue;ticketRevenue = 0;转账 amount 给 owner()
- 禁止:withdraw 读取 address(this).balance 作为可提金额
```

| 检查 | 说明 | 验收 |
|---|---|---|
| 不变量测试 | 任意操作序列后 `balance == ticketRevenue + totalStaked`(Foundry 不变量测试) | TC-13 |
| owner 不能提保证金 | 开启预存并存入后,owner `withdraw()` 不减少保证金池;`totalStaked` 不变 | AC-35 + TC-13 |
| 取款安全 | 推荐 `call{value:amount}("")` + 检查返回值(替代 `transfer` 2300 gas 限制);若用 `transfer`,须在 README 说明 EOA 限制 | §8.2.3 |
| 余额为 0 | 以**前端禁用**为主;若合约选择 revert,文案 `"Nothing to withdraw"` 超出 canon §8 revert 表,**未与 Lead 同步前不得作为唯一实现**(OQ-06);no-op 亦可但需 README 说明 | AC-11 边界 |

> 若 P1 选择其他隔离方案(如独立 `StakeVault` 合约),必须保证同一不变量与 AC-34…AC-37 可测,并在技术方案中说明;接口语义不变。

## 4.10 gas 与确认等待估算

> **说明**:本项目**尚未实现/部署**,以下为**设计预算**,非实测;P4 必须在 Sepolia 实测后把实测值写入 README,报告/答辩只引用实测值。

| 操作 | 类型 | 预算量级(设计值,±50%) | 优化要点 |
|---|---|---|---|
| 部署(完整合约) | 写 | 约 2.2M–2.8M gas | 控制字符串/事件;不开 optimizer 也可,但建议 optimizer 200 |
| `createShow` | 写 | 约 200k–260k | poster/name 长度敏感(calldata + storage) |
| `openSale`/`closeSale` | 写 | 约 30k–50k | 1 storage 写 + 事件 |
| `setPrice` | 写 | 约 30k–45k | 1 storage 写 + 事件 |
| `stake`/`unstake` | 写 | 约 45k–65k | 2 mapping 写 + 转账 |
| `buy` | 写 | 约 150k–230k | 6 mapping/struct 写 + 铸造 + 事件;可用自定义 error 替代 require 字符串降本 |
| `verify` | 写 | 约 50k–75k | 1 storage 写 + 事件 |
| `withdraw` | 写 | 约 35k–50k | 1 storage 写 + 转账 |
| `transferFrom`(Open/Detect) | 写 | 约 60k–90k | 标准 ERC-721 + `_update` 策略判断 |
| Check / 全部读函数 | 只读 `eth_call` | **0** | 不上链、不花 gas(AC-20) |

**确认等待**:`tx.wait(1)` 等 1 个区块;Sepolia 正常数秒~1 分钟,慢时可达 1–2 分钟(实现阶段实测记录);前端不设固定超时判失败,pending 超过 5 分钟提示「可在 Etherscan 查看」并允许关闭浮层(后台继续等待)。

## 4.11 部署参数与常量

| 项 | 目标值 |
|---|---|
| 网络 / chainId | Sepolia / `11155111`(十六进制 `0xaa36a7`) |
| 浏览器 | `https://sepolia.etherscan.io` |
| 合约名/符号 | `LivePass Concert Ticket` / `LIVEPASS`(AC-01) |
| 编译器 | Solidity `^0.8.20`;部署前锁定具体版本写入 README(建议 solc 0.8.24+) |
| 依赖 | OpenZeppelin Contracts 5.x(`ERC721`、`Ownable`、`Base64`、`Strings`) |
| 构造参数 | 无;`owner = msg.sender`(部署钱包即主办方) |
| `STAKE_COOLDOWN` | **建议 600 秒(10 分钟)**,部署时定值并写入 README(AC-37 使用) |
| `MIN_STAKE_FLOOR` | **建议 0.001 ETH**,部署时定值并写入 README;前端 P-07 用它校验 `minStake` |
| ABI / 地址 | **实现阶段产出**:部署地址与部署交易哈希写入 README(AC-01/AC-40);目标 ABI 表见 §12.1 |

---
# 5. 前端组件与路由

## 5.1 路由实现要求

> 本项目从零实现,前端**必须**用 React Router 实现 canon §5 的 12 个页面路由;路由表与守卫见 §3.0.1。要求:①深链可直接打开并刷新;②浏览器后退正常;③未连接访问受限页→重定向 `/` 并保留 `returnTo`;④非 owner 访问 `/admin/*`→重定向 `/shows` + toast;⑤未知路由→404(P-11)。

## 5.2 目录结构与页面组件

```text
src/
├── main.jsx / 根组件              # 根组件 = Providers(Wallet/Tx/Toast) + <AppRoutes/>
├── config.js                     # 目标合约地址(实现阶段填入)/ ABI / chainId / 部署区块 / 常量
├── routes/{AppRoutes.jsx, guards.jsx}
├── context/WalletContext.jsx     # provider/signer/wallet/role/connect/switch/logout/事件监听
├── hooks/{useTx,useShows,useShow,useMyTickets,useStake,useProvenance,useRevertReason}.js
├── pages/{Login,Shows,ShowDetail,Tickets,TicketDetail,AdminNew,AdminShows,AdminVerify,AdminRevenue,Stake,NotFound}Page.jsx
├── components/
│   ├── layout/{Shell,TopBar,GlassCard}.jsx
│   ├── common/{StatusBadge,StatTile,EmptyState,ErrorState,LoadingSkeleton,ConfirmDialog,Toast,NetworkBanner}.jsx
│   ├── show/{ShowCard,PolicyBadge,StakeBadge}.jsx
│   ├── ticket/{TicketCard,TicketArt,ProvenanceList}.jsx
│   ├── stake/{StakeCard,CooldownCountdown,EligibilityHint}.jsx
│   └── tx/TxOverlay.jsx
├── lib/{eth.js,errors.js,events.js,tokenUri.js,policy.js}
└── styles/tokens.js
```

## 5.3 公共组件规格

| 组件 | Props(必须) | 行为 | 归属 |
|---|---|---|---|
| `WalletProvider`(Context) | `children` | `{wallet, chainId, role, ownerAddr, provider, signer, connect(), switchNetwork(), logout()}`;监听 `accountsChanged`/`chainChanged` | P3 |
| `TxOverlay`(P-04) | `txState,onClose,explorerBase` | 七态;pending 不可关;`aria-live="assertive"`;哈希+Etherscan | P3/P2 |
| `PolicyBadge` | `policy: 0|1|2` | `Resale: Closed/Open/Detect` 胶囊 + 说明 tooltip/P-03 说明块 | P2 |
| `StakeBadge` | `minStake: bigint` | `minStake>0` 显示 `Stake required: x ETH`;0 不显示 | P2 |
| `EligibilityHint`(P-03) | `minStake, stakeOf, stakeSince, cooldown` | 已满足/还差多少/冷却倒计时三种状态 | P2/P3 |
| `CooldownCountdown` | `readyAt: number` | `mm:ss` 倒计时,到点刷新;基于本地时钟与链上 `stakeSince` 计算 | P2/P3 |
| `ProvenanceList` | `provenance`(5 元组) | Issuer/First buyer/Current holder/Minted at/Status;地址可复制,Etherscan 链接 | P2 |
| `NetworkBanner` | `chainId` | 非 11155111 顶部横幅 + 切换按钮 | P2 |
| `EmptyState`/`ErrorState`/`LoadingSkeleton`/`ConfirmDialog`/`Toast`/`StatusBadge`/`StatTile`/`ShowCard`/`TicketCard`/`TicketArt` | 见各页 | 见 §3.11 | P2 |

## 5.4 状态管理

| 层 | 方案 | 说明 |
|---|---|---|
| 钱包/网络/角色 | `WalletContext` | 全局唯一;交易后 `refreshRole()` |
| 链上数据 | 页面 hook:`useShows`(P-02/P-08/P-10)、`useShow`(P-03)、`useMyTickets`(P-05)、`useStake`(P-12)、`useProvenance`(P-06/P-09) | `{status:"idle"|"loading"|"ready"|"error", data, error, reload()}` |
| 交易 | `useTx`(Provider 层单例) | 全局 tx lock;七态;成功后 `onConfirmed` |
| 提示 | Toast 队列(Context) | 账户/网络/信息 |
| 表单 | 组件内 state + 校验函数 | 不引入表单库 |
| 持久化 | **不持久化链上数据** | 允许持久化非权威 UI 偏好(如海报选择) |

## 5.5 P2/P3 接口约定

- **P3 提供**:`WalletContext`、`useTx()`、`lib/events.fetchLogs()`(部署区块起分块)、`lib/errors.decode()`、`lib/policy.js`(策略判定/文案)、ABI 与常量。
- **P2 提供**:页面/公共组件、表单校验(V-07)、路由与守卫、空/错/加载态、可访问性。
- **联调契约**:P2 不直接 `new Contract`;写操作统一 `useTx().run({action,call,onConfirmed})`;P2 可先用 `lib/mockData.js`(3 场演出 × 三策略、2 张票、预存场景)开发 UI。
- **错误边界**:`App` 外层 React `ErrorBoundary`,崩溃显示「页面出错 + 刷新」,不得白屏。

---
# 6. 数据流

## 6.1 读函数(免费 `eth_call`)

| 页面 | 数据与调用 | 时机 |
|---|---|---|
| P-01 | `owner()`(C-14) | 连接后一次 |
| P-02 | `showCount()` + `shows(i)`×N(并行) | 进入/刷新/切号 |
| P-03 | `shows(id)`(C-13)+ `hasBought`(C-16)+ `stakeOf`(C-22)+ `stakeSince`(C-23)+ `STAKE_COOLDOWN`(C-27) | 进入/刷新/账户变化 |
| P-05 | `Transfer` 事件枚举(部署区块起)+ `ownerOf`+`tokenShow`+`used`+`shows`+`ticketOf`+`mintHolder` | 进入/刷新/30s 轮询(仅 used) |
| P-06 | `tokenURI`+`provenance`+`shows`+`ownerOf`+`used` | 进入/刷新/30s 轮询 |
| P-07/P-08 | `showCount` + `shows(i)`;P-08 另读 `ticketOf` 计数 | 进入/交易后 |
| P-09 | `ownerOf`+`used`+`mintHolder`+`tokenShow`+`shows`+`provenance` | Check/Verify/刷新 |
| P-10 | `showCount`+`shows`+`TicketBought` 计数/Σprice + `ticketRevenue`(C-26)+ `getBalance` | 进入/交易后 |
| P-12 | `stakeOf`+`stakeSince`+`shows`(门槛列表)+ 常量 | 进入/交易后 |

**纪律**:全部走 `BrowserProvider`;同批读 `Promise.all` 并行;读失败必须进 P-11 错误态,单条失败局部降级;不把链上数据写 localStorage(AC-28)。

## 6.2 写函数(交易)

### 6.2.1 统一交易管线(所有写操作必须走这条)

```text
①校验(已连接/chainId/tx lock/参数)→ ②只读预检(可选,免费,失败不弹钱包)
→ ③tx = await call(contract)(awaiting_signature)→ ④pending(展示 tx.hash+Etherscan)
→ ⑤receipt = await tx.wait(1) → ⑥解析 receipt.logs(§6.2.3)→ ⑦confirmed + onConfirmed(receipt)
→ ⑧按 §6.4 刷新;任何异常路径释放 tx lock、恢复按钮(4001→rejected;CALL_EXCEPTION→reverted;其它→failed)
```

### 6.2.2 各写操作的调用与参数

| 操作 | 合约调用 | 参数构造 | 前置预检 | 成功后刷新 |
|---|---|---|---|---|
| 发布演出 | `createShow(name,poster,price,policy,minStake)` | `parseEthToWei` 解析 price/minStake;policy 取 0/1/2 | 表单校验 V-07 | 解析 `ShowCreated` → `/admin/shows` |
| 调价 | `setPrice(showId,newPrice)` | 同上 | `saleOpen=false`(否则前端禁用;合约会 revert) | 解析 `PriceUpdated` + 重读 `shows(id)` |
| 策略调整(开售前) | `setResalePolicy(showId,policy)`(C-31) | `BigInt(policy)`(0/1/2) | `rulesFrozen=false`;否则前端禁用 | 解析 `ResalePolicyUpdated` + 重读 `shows(showId)` |
| 门槛调整(开售前) | `setStakeRequirement(showId,wei)`(C-32) | `parseEthToWei` 解析 | `rulesFrozen=false`;`minStake=0` 或 ≥`MIN_STAKE_FLOOR` | 解析 `StakeRequirementUpdated` + 重读 `shows(showId)` |
| 开售/停售 | `openSale`/`closeSale(showId)` | `BigInt(showId)` | — | 解析 `SaleToggled`;重读列表 |
| 预存 | `stake()` | `{ value: amount }` | `amount>0`、余额充足 | 重读 `stakeOf`/`stakeSince` |
| 取回 | `unstake(amount)` | `BigInt(amount)` | `0<amount≤stakeOf` | 重读 `stakeOf` |
| 购票 | `buy(showId)` | `{ value: show.price }` | `saleOpen`、`!hasBought`、预存/冷却 | 解析 `TicketBought` 得 tokenId;刷新 P-03/P-05 |
| 验票 | `verify(showId,tokenId)` | 两个 BigInt | Check 通过 + 策略放行 | 重 Check;刷新 P-09/P-10 |
| 提现 | `withdraw()` | 无 | `ticketRevenue>0`、owner | 重读 `ticketRevenue`/余额/统计 |

### 6.2.3 receipt 事件解析(必须)

```js
const parsed = receipt.logs
  .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
  .filter(Boolean);
const created = parsed.find((e) => e?.name === "ShowCreated");   // showId
const bought  = parsed.find((e) => e?.name === "TicketBought");  // tokenId/buyer/price
const verified= parsed.find((e) => e?.name === "TicketVerified");// venue
const staked  = parsed.find((e) => e?.name === "Staked");        // amount/total
const resalePolicyUpdated = parsed.find((e) => e?.name === "ResalePolicyUpdated");   // showId/resalePolicy
const stakeRequirementUpdated = parsed.find((e) => e?.name === "StakeRequirementUpdated"); // showId/minStake
const withdrawn = parsed.find((e) => e?.name === "Withdrawn");   // amount
```

**兜底**:解析不到预期事件时不得猜测 tokenId=0;改用「按 buyer 过滤 `Transfer` 事件 + `ownerOf` 校验」确认;仍失败则提示「交易已确认,但数据解析失败,请刷新」。

### 6.2.4 幂等与防重复提交

| 防护 | 规则 |
|---|---|
| 前端 tx lock | 全局同一时刻只允许 1 笔在途交易 |
| 按钮禁用 | preparing/awaiting_signature/pending 期间禁用触发按钮 |
| 合约级 | 重复 `buy` 被 `hasBought` 拦截;重复 `verify` 被 `used` 拦截;重复 `stake` 合法(累加) |
| 多标签页 | 以链上状态为准;第二笔可能 revert(正常现象,显示原文) |

## 6.3 事件查询策略(必须 `fromBlock` 分块)

> 事件查询一律 `fromBlock = 部署区块`、`toBlock = "latest"`,按 5000 区块分块串行;禁止 `latest-N` 窗口(会漏历史票,AC-19/AC-29)。部署区块号在实现部署后写入 `src/config.js` 的 `DEPLOY_BLOCK`;若尚未配置,页面显示「历史索引未配置」警告,不得静默错误。

```js
export async function fetchLogs(contract, filter, fromBlock, toBlock, chunkSize = 5000) {
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    logs.push(...(await contract.queryFilter(filter, start, end)));
    if (logs.length > 2000) break;       // 防御异常数据量
  }
  return logs;
}
```

| 场景 | 事件/过滤 | 范围 | 频率 | 用途 |
|---|---|---|---|---|
| P-05 枚举我的票 | `Transfer(null, wallet)` | 部署区块起分块 | 进入/刷新/切号 | 候选 tokenId → `ownerOf` 过滤 |
| P-05 兜底 | `TicketBought(null, wallet, null)` | 同上 | 枚举异常时 | 找 tokenId |
| P-10 售票数/成交额(AC-29) | `TicketBought(null,null,null)` | 部署区块起分块 | 进入/刷新/交易后 | 计数 + Σprice(验收判据) |
| P-09 已验票数 | `TicketVerified(showId,null,null)` | 部署区块起分块 | 选择 showId 时/Verify 后 | 该场计数 |
| 状态实时性 | 轮询单票 `used(tokenId)` | 单 tokenId | 30 秒(页面可见时) | AC-21 |
| P-08 已售数 | 不用事件 | — | — | `nextTicketNo-1` 仅 UI 交叉校验 |

**`filters` 语法**:`contract.filters.TicketBought(null, wallet)`;占位参数用 `null`(不是 `undefined`)。页面隐藏时暂停轮询(`visibilitychange`)。

## 6.4 缓存与刷新策略

| 触发 | 刷新范围 | 说明 |
|---|---|---|
| 进入页面 | 该页全部读 | 首次加载 |
| 自己交易确认 | 该页 + 相关页(§6.2.2) | 先按 receipt 更新,再全量重读一次 |
| `accountsChanged` | 清空全部数据 → 按新钱包重读 | 角色可能变化 |
| `chainChanged` | 重新校验网络;回 Sepolia 则重读;否则只显示网络提示 | 必须实现 |
| 页面重新可见 | 当前页重读 | `visibilitychange` |
| 30 秒轮询 | 仅单票 `used` / 单票 `ownerOf` | 轻量,不做全量 |
| 手动 `↻ Refresh` | 当前页全部读 | P-02/P-05/P-08/P-10/P-12 |
| 浏览器刷新 | 从链上重建全部数据(AC-28) | 禁止依赖本地缓存 |

| 数据类型 | 是否缓存 | TTL | 位置 |
|---|---|---|---|
| `shows` 列表 | 内存会话缓存 | 30 秒或交易后失效 | hook 模块内 |
| 我的票(tokenId 列表) | 内存 | 页面存活期 + 交易后失效 | `useMyTickets` |
| `used` | **不缓存** | 0 | 轮询即最新 |
| `tokenURI` | **不缓存** | 0 | 票面随状态变化(§4.6),缓存会导致 AC-21 失败 |
| `provenance` | 内存短缓存 | ≤10 秒 | 展示用 |
| 海报图片 | 浏览器 HTTP 缓存 | 由静态资源决定 | 合理 |
| 任何链上数据 | **禁止 localStorage** | — | AC-28 |

## 6.5 错误分类与 revert 解码

| ethers v6 `code` | 原因 | UI 状态 | 文案 | 可重试 |
|---|---|---|---|---|
| `ACTION_REJECTED`/4001 | 用户拒绝 | rejected | `已取消交易`(中性) | 用户主动 |
| `CALL_EXCEPTION` | 合约 revert | reverted | revert 原文 + 中文解释(§4.7) | 视原因 |
| `INSUFFICIENT_FUNDS` | 余额不足 | failed | `钱包余额不足,请先领取 Sepolia 测试币` | 充值后 |
| `NETWORK_ERROR`/`TIMEOUT` | 网络异常/超时 | failed | `网络异常,请重试` | 可 |
| `NONCE_EXPIRED` | 交易被替换 | failed | `交易已被替换或取消,请刷新后重试` | 可 |
| `UNPREDICTABLE_GAS_LIMIT` | 预估失败(常见于会 revert) | reverted | 优先 `error.reason`,否则「交易预计失败」+ 详情 | 视原因 |
| 其他 | 未分类 | failed | `操作失败:{message≤200 字}` + 可折叠详情 | 可 |

**解码优先级**:`err.reason` → `err.revert?.args[0]` → 从 `shortMessage` 正则提取 → 关键字兜底。**纪律**:不得改写英文原文(AC-27)。

## 6.6 tokenURI 解码与票面渲染

```js
export function decodeTokenURI(uri) {
  const prefix = "data:application/json;base64,";
  if (!uri?.startsWith(prefix)) throw new Error("UNSUPPORTED_TOKEN_URI");
  const bytes = Uint8Array.from(atob(uri.slice(prefix.length)), (c) => c.charCodeAt(0));
  const json = JSON.parse(new TextDecoder("utf-8").decode(bytes));   // 必须 UTF-8
  if (!json.image?.startsWith("data:image/svg+xml;base64,")) throw new Error("INVALID_IMAGE");
  return { name: json.name, description: json.description, image: json.image };
}
```

| 步骤 | 失败处理 |
|---|---|
| `tokenURI` 调用 revert(`ERC721NonexistentToken`) | P-06 空态「票不存在」 |
| base64/UTF-8 解码失败 | E-06-11 错误态(不白屏) |
| `JSON.parse` 失败 | E-06-11;根因:合约用 `abi.encodePacked` 手工拼 JSON/SVG,**演出名/发行方地址未转义**(§8.2.5) |
| `<img>` 渲染失败 | 降级背景 + 文字说明 + Etherscan 链接 |

**SVG 内容要求(AC-10/AC-39)**:票面至少包含 演出名、票号、当前持有人(hex)、发行方(issuer)、首次买家(mintHolder)、状态文案(S0/S0'/S1/S2)、网络标识;状态行颜色区分(青/琥珀/绿/红)。

---
# 7. 验收标准 AC-01…AC-40

> **编号来源**:AC-01…AC-40 全部来自 canon §7,本文不新增 AC 编号,只补「判定步骤/测试数据/执行层」。
> **判定原则**:P4 在不读代码的情况下按步骤判定,记录 `PASS/FAIL + 证据(tx/地址/截图/README 行)`。测试数据由技术团队在 Sepolia 准备;本阶段不声称已执行。
> **执行层**:`合约` = Foundry 单测/脚本;`链上` = Sepolia 真实交易 + 浏览器;`UI` = 前端操作;`合规` = 证据与文档检查。

## 7.1 测试数据基线(实现阶段由 P4 准备)

| 标识 | 说明 |
|---|---|
| O | 部署/主办方钱包(部署合约者,`owner()`);地址由部署产生,测试记录回填 |
| F1/F2 | 观众钱包(需测试 ETH);地址由测试记录回填 |
| F3 | 第三观众钱包(溯源转售/Closed 反例用) |
| 演出 S-C | 策略 Closed,票价如 0.01 ETH,`minStake=0` |
| 演出 S-O | 策略 Open,票价如 0.008 ETH,`minStake=0` |
| 演出 S-D | 策略 Detect,票价如 0.005 ETH,`minStake=0` |
| 演出 S-K | 策略 Open + `minStake=0.002 ETH`(预存门槛),票价如 0.006 ETH |
| 演出 **S-P** | **未开售**演出(策略/门槛可编辑;用于 AC-33⑤ 开售前 setter 验证);可由 `createShow` 新建 |
| 常量 | `STAKE_COOLDOWN`、`MIN_STAKE_FLOOR` 取部署值(README 记录) |
| 票面 | 同一 tokenId 在 S0→S0'/S1/S2 的 `tokenURI` 输出可用于比对 |

## 7.2 AC-01…AC-29(基础功能与课程合规)

| 编号 | canon 验收内容(摘要) | 判定步骤 | 预期/证据 | 执行层 |
|---|---|---|---|---|
| **AC-01** | 部署后 `name()`/`symbol()`/`owner()`/`showCount()` 正确;合约地址与部署交易记录进 README | 部署后读 4 值;查 README | name/symbol 与设计一致;owner=部署者;showCount=0;README 含地址+tx 哈希 | 合约/链上 |
| **AC-02** | 未开售 `buy()` revert `"Sale is not open"` | 新建演出(默认未开售),F1 调 `buy` | revert 原文;F1 未获票 | 合约/链上 |
| **AC-03** | `openSale()` 后 `saleOpen==true` 且发出 `SaleToggled` | O 对 S-C 调 `openSale`;查 `shows` 与日志 | `saleOpen=true`;`SaleToggled(showId,true)` 存在 | 合约/链上 |
| **AC-04** | 支付金额 ≠ 票价 revert `"Send the exact ticket price"` | F1 半价/双倍各调一次 `buy` | 两次均 revert 原文;未出票 | 合约/链上 |
| **AC-05** | 正常购票:`ownerOf`=买家、`hasBought`=true、合约余额+=票价、发出 `TicketBought` | F1 以精确票价 `buy(S-O)`;读 receipt/状态 | `ownerOf(tokenId)=F1`;`hasBought[F1][S-O]=true`;余额+票价;事件字段正确 | 合约/链上 |
| **AC-06** | 同钱包同演出第二次 `buy()` revert `"One ticket per wallet"` | F1 再次 `buy(S-O)` | revert 原文;仍 1 张 | 合约/链上 |
| **AC-07** | `verify()` 成功:`used[tokenId]=true` 且发出 `TicketVerified` | O 对 AC-05 的票 `verify` | `used=true`;`TicketVerified(showId,tokenId,O)` | 合约/链上 |
| **AC-08** | 二次 `verify()` revert `"Ticket already used"` | O 再 `verify` 同一票 | revert 原文 | 合约/链上 |
| **AC-09** | 非 owner 调用 `verify()` revert `OwnableUnauthorizedAccount` | F2 调 `verify`(任意票) | 自定义 error 含 `OwnableUnauthorizedAccount` | 合约/链上 |
| **AC-10** | `tokenURI()` 解码为合法 JSON + base64 SVG,含演出名/票号/持有人/状态 | 对多张票取 `tokenURI` 解码 | JSON 合法;`image` 为 base64 SVG;含演出名、`Ticket #`、holder hex、状态文案 | 合约/链上 |
| **AC-11** | `withdraw()` 后票款全部转出:`ticketRevenue == 0`、owner 余额增加;若存在保证金池,合约余额 `== totalStaked` 且 `totalStaked` 不变(canon 2026-10-19 改写) | 记录 `ticketRevenue`/`totalStaked`/余额;O 调 `withdraw`;再读三值 | `ticketRevenue=0`;O 余额增加(扣 gas);`totalStaked` 不变;有保证金时 `balance==totalStaked`,无保证金时 `balance==0` | 合约/链上 |
| **AC-12** | 未连接钱包访问受限页面 → 提示连接,不发交易 | 无痕窗口直开 `/tickets` | 重定向 `/` 提示连接;0 条合约读/写 | UI |
| **AC-13** | 非 Sepolia 网络 → 提示切链;拒绝则停留 | 钱包切非 Sepolia;点连接;拒绝切链 | 提示切链;拒绝后停留 P-01,无白屏 | UI |
| **AC-14** | 用户拒绝签名 → 页面不崩溃、提示已取消、按钮恢复 | P-03 点 Buy 后拒绝 | P-04 rejected「已取消」;按钮恢复;无 tx | UI |
| **AC-15** | pending 状态显示哈希;确认后数据刷新 | 发起购票;观察 pending→confirmed | pending 有哈希+Etherscan;确认后票夹/按钮状态刷新 | UI |
| **AC-16** | owner 钱包 → 控制台;其他钱包 → 观众端 | O 连接;F1 连接 | O→`/admin/shows`;F1→`/shows`;无管理入口 | UI |
| **AC-17** | 海报墙渲染 `showCount()` 条演出,字段与链上一致 | 读链上;对比卡片 | 数量/名称/价格/销售状态/策略标签一致 | UI |
| **AC-18** | 详情页展示票价、转售策略、预存门槛 | 打开 S-C/S-O/S-D/S-K 详情 | 票价、策略说明、门槛说明齐全且与链上一致 | UI |
| **AC-19** | 票夹只显示当前钱包持有的票(按所有权枚举,非购买记录) | F1 购票后打开票夹;转手后复查 | 只显示 `ownerOf==F1` 的票;转出后不显示;受让票显示 `Ticket #—` | 链上/UI |
| **AC-20** | Check 预检零 gas 返回持有人 + 使用状态 + 策略判定 | P-09 输入 showId/tokenId 点 Check | 无签名弹窗/交易;显示持有者、USED/UNUSED、策略判定(Closed/Open/Detect) | UI |
| **AC-21** | 验票后票卡状态由 `UNUSED · VALID` 变 `VERIFIED · ADMIT` | 验票前后看 F1 票夹 | 状态变 S1;`used=true`;30 秒内自动/刷新后更新 | UI |
| **AC-22** | 空态:无票/无演出/无收入时显示空态与引导 | 新钱包看票夹;`showCount=0` 看海报墙 | 空态文案 + CTA;不显示破图/0 值误导 | UI |
| **AC-23** | RPC 失败 → 错误态 + 重试按钮 | 断网/模拟失败后刷新页面 | P-11 错误态 + Retry;恢复后重试成功 | UI |
| **AC-24** | 同一钱包可对不同演出各购一票 | F1 购买 S-O 与 S-D(或不同演出) | 两笔均成功;两张不同 tokenId;票夹显示 2 张 | 合约/链上 |
| **AC-25** | 价格展示与链上 wei 一致(0.01 ETH = 10^16 wei) | 对比链上 price 与页面展示;P-07 预览 | 展示一致;P-07 输入 0.01 预览 `10000000000000000` wei | UI/合约 |
| **AC-26** | 提现入口仅 owner 可见可点 | F1 登录:无提现入口;O 登录可见 | F1 不可见;O 可见且可点(票款>0 时) | UI/权限 |
| **AC-27** | 验票失败时解码 revert reason 并原样显示 | P-09 对已验票/场次错配的票 Verify | 显示 `Ticket already used` / `Ticket does not belong to this show` 原文 + 中文解释 | UI |
| **AC-28** | 刷新页面后全部数据从链上重建 | 在 P-05/P-08/P-10 刷新;清 localStorage 再刷新 | 数据与链上一致;刷新触发新的 `eth_call` | 链上/UI |
| **AC-29** | 概览四块口径:演出数=`showCount`、售票数=`TicketBought` 事件计数、成交额=Σ成交价、可提现=合约可提余额;事件查询须从部署区块分块 | 脚本 `fetchLogs(TicketBought, DEPLOY_BLOCK, latest)` 统计;对比 P-10;F5 刷新 | 四块值与链上一致;刷新后一致;事件计数与 `nextTicketNo-1` 交叉校验相等 | 链上/UI |

> **资金隔离判定补充(canon §8,2026-10-19 Lead 裁决)**:AC-11 已按 canon 新条文改写(`ticketRevenue` 归零、`totalStaked` 不变);该不变量同时作为 AC-34/AC-35/AC-36 的判定补充,并由 TC-13 覆盖。

## 7.3 AC-30…AC-40(策略、预存、溯源、课程合规)

| 编号 | canon 验收内容(摘要) | 判定步骤 | 预期/证据 | 执行层 |
|---|---|---|---|---|
| **AC-30** | **Closed 策略**:`transferFrom`/`safeTransferFrom` revert `"Resale not permitted"`;票面不出现 TRANSFERRED | F1 持有 S-C 票;F1 用钱包/Etherscan 尝试 `transferFrom(F1,F3,tokenId)` | revert 原文;`ownerOf` 仍 F1;`tokenURI` 无 `TRANSFERRED` | 合约/链上 |
| **AC-31** | **Open 策略**:转移成功;票面变 `TRANSFERRED · ADMISSIBLE`;`verify()` 放行 | F1 持有 S-O 票 → `transferFrom(F1,F3,tokenId)`;F3 打开 P-06;O 验票 | 转移成功;票面 S0';`verify` 成功(`used=true`) | 合约/链上 |
| **AC-32** | **Detect 策略**:转移成功但 `verify()` revert `"Resale not permitted"`;票面 `RESOLD · NOT ADMISSIBLE` | F1 持有 S-D 票 → 转移给 F3;O 验票;读 tokenURI | 转移成功;票面 S2;`verify` revert 原文;`used=false` | 合约/链上 |
| **AC-33** | 策略与预存门槛在开售后不可修改(revert `"Rules are frozen after sale opens"`) | ①开售 S-C 后 O 调 `setPrice`;②O 调 `setResalePolicy(S-C,1)`;③O 调 `setStakeRequirement(S-C,0.002e18)`;④读 `shows(S-C)` 的 `resalePolicy`/`minStake`;⑤在 **S-P(未开售演出)** 用同名 setter 修改并查事件 | ①-③ 均 revert 原文 `Rules are frozen after sale opens`;④规则值与开售前一致;⑤开售前修改成功且发出 `ResalePolicyUpdated`/`StakeRequirementUpdated` | 合约/链上 |
| **AC-34** | 预存门槛开启:`buy()` 前未达 `minStake` → revert `"Insufficient stake"` | F2 未预存,购买 S-K | revert 原文;未出票 | 合约/链上 |
| **AC-35** | 预存后 `buy()` 成功;`stakeOf(wallet)` 记录正确;取回 `unstake()` 后余额归零且余额到账 | F2 `stake(0.002 ETH)` → 等冷却 → `buy(S-K)`;`unstake(全部)` | 购票成功;`stakeOf` 正确增减;取回后到账、`stakeOf=0` | 合约/链上 |
| **AC-36** | 预存门槛关闭(`minStake=0`)时无需预存即可购票 | 新钱包 F3 购买 S-O(无预存) | 购票成功;`stakeOf=0` 不影响 | 合约/链上 |
| **AC-37** | 预存冷却:存入后未满冷却时间不可用该笔保证金购票(revert `"Stake cooling down"`) | F3 `stake` 后立即购买 S-K(不等待) | revert 原文;等待 `STAKE_COOLDOWN` 后重试成功(与 AC-35 对照) | 合约/链上 |
| **AC-38** | **溯源**:`provenance(tokenId)` 返回发行方、首次买家、当前持有人、铸造时间、使用状态;与 `Transfer` 事件一致 | 对已转移/已验票的票读 `provenance`;对照 `Transfer` 日志 | 5 元组正确;`issuer=O`;`mintHolder=F1`;`currentHolder=F3`;`mintedAt` 与区块时间一致;`used` 与 `used()` 一致 | 合约/链上 |
| **AC-39** | 票面与前端展示「发行方 / 首次买家 / 当前持有人」;任何人可核对链上日志 | 打开 P-06 / 解码 tokenURI;Etherscan 核对 `Transfer` | 票面与页面均含三者;Etherscan 日志可核对一致 | UI/链上 |
| **AC-40** | **课程合规**:四层架构可演示(前端→ethers→MetaMask→Sepolia 合约);README 含部署交易哈希与合约地址;≥6 类链上交易 + ≥4 类 revert 有截图/记录 | 按 §1.5 证据清单逐项检查 README/截图/演示 | 4 层可演示;README 有地址+tx;≥6 类交易、≥4 类 revert 记录齐全 | 合规 |

## 7.4 AC 执行顺序建议(P4)

```text
批次 1(部署与只读):AC-01 → AC-12 → AC-13 → AC-16 → AC-17 → AC-18 → AC-22(空态)→ AC-23 → AC-25 → AC-28
批次 2(基础购票/验票):AC-02 → AC-03 → AC-04 → AC-05 → AC-06 → AC-07 → AC-08 → AC-09 → AC-24 → AC-29(初值)
批次 3(三策略/规则编辑):AC-30 → AC-31 → AC-32(分别在 S-C/S-O/S-D 上执行)→ AC-33(在 S-P 上验证开售前 setter,在 S-C 上验证开售后三 revert)
批次 4(预存):AC-34 → AC-35 → AC-36 → AC-37(注意冷却等待,可与其他批次穿插)
批次 5(溯源/票面/提现/合规):AC-38 → AC-39 → AC-21 → AC-27 → AC-20 → AC-26 → AC-11 → AC-14 → AC-15 → AC-40
```

## 7.5 补充测试用例 TC-01…TC-24

> TC 是 AC 的执行细则,不占用 AC 编号;覆盖三策略、预存/冷却、溯源、课程证据。

| 编号 | 用例 | 前置 | 步骤 | 预期 | 关联 AC |
|---|---|---|---|---|---|
| TC-01 | 四层架构可演示 | 本地/部署环境 | 连接 MetaMask→读链→发起一笔写交易→Etherscan 核对 | 四层链路完整;交易可在浏览器核对 | AC-40 |
| TC-02 | 部署参数与 README | 实现阶段部署后 | 读 name/symbol/owner/showCount/常量;查 README | 与 §4.11 一致;README 含地址/tx/编译器/常量 | AC-01/AC-40 |
| TC-03 | createShow 三策略参数 | O 登录 P-07 | 分别创建 Closed/Open/Detect;再试 policy=3 | 三次成功且链上 policy 正确;policy=3 revert `"Invalid resale policy"` | AC-17/AC-30…AC-32 |
| TC-04 | 票价精度 | O 登录 P-07 | 输入 0.01 / 0.008 / 0.000000000000000001 / 0 / 1.2.3 | 前两者 wei 精确;0 与非法格式被拦截;19 位小数按规则拒绝 | AC-25 |
| TC-05 | 名称特殊字符 | O 登录 P-07 | 输入含 `"`/`&`/`<` 的名称 | 前端拦截并提示(合约票面手工拼 JSON/SVG,不转义) | AC-10 |
| TC-06 | 开售冻结与开售前 setter | O 对 S-C/未开售演出 | 开售前用 `setResalePolicy`/`setStakeRequirement` 修改并查事件;`openSale` 后再试 `setPrice`/`setResalePolicy`/`setStakeRequirement` | 开售前修改成功+事件;开售后三者均 revert `"Rules are frozen after sale opens"`;前端禁用编辑 | AC-33 |
| TC-07 | Closed 转移拦截 | F1 持有 S-C 票 | Etherscan Write 调 `transferFrom` | revert `"Resale not permitted"`;ownerOf 不变 | AC-30 |
| TC-08 | Open 转移与入场 | F1 持有 S-O 票 | 转移到 F3;F3 打开 P-06;O 验票 | 票面 S0';验票成功 | AC-31 |
| TC-09 | Detect 转移与拒绝入场 | F1 持有 S-D 票 | 转移到 F3;O 验票 | 票面 S2;revert `"Resale not permitted"` | AC-32 |
| TC-10 | 转回首次买家 | F1→F3→F1(Open/Detect) | 观察票面与 used | 回到 S0/S1;记录已知边界(§4.6.3 第 2 条) | AC-31/AC-38 |
| TC-11 | 预存与取回 | F2 | stake 0.002 → 读 stakeOf → unstake 全部 | stakeOf 正确;到账;balance 不变量保持 | AC-35 |
| TC-12 | 冷却倒计时 UI | F2 刚 stake | 打开 P-12/P-03 | 倒计时正确(以 stakeSince+STAKE_COOLDOWN 计);到期后 UI 变为可购票 | AC-37 |
| TC-13 | 资金隔离不变量 | 合约有票款+保证金 | Foundry 不变量测试:在 stake/unstake/buy/verify/withdraw 每类操作后断言 `balance == ticketRevenue + totalStaked`;owner withdraw 后 `totalStaked` 不变 | 不变量恒成立;owner 不能提保证金;withdraw 只减 ticketRevenue | AC-11/AC-35 |
| TC-14 | 最小闭环交易证据 | 部署后 | 依次 createShow→openSale→buy→verify→withdraw | 每步有 tx 哈希与状态读数,写入 README | AC-05/AC-07/AC-11/AC-40 |
| TC-15 | 四类 revert 证据 | 合约就绪 | 未开售/金额不符/一人一票/策略拒绝(或预存/冷却)各一次 | ≥4 类 revert 原文记录+截图 | AC-40 |
| TC-16 | tokenURI 四态取样 | 四张对应票 | 分别取 S0/S0'/S1/S2 的 tokenURI 并解码 | 状态文案与颜色正确;含发行方/首次买家/持有人 | AC-10/AC-39 |
| TC-17 | 票夹所有权枚举 | F1/F3 | F1 购票;转手给 F3;两人分别刷新票夹 | 只显示各自持有的票;受让票 `Ticket #—` | AC-19 |
| TC-18 | 事件分块查询 | 部署区块已知 | 从部署区块起分块查 `TicketBought`/`TicketVerified`;再用 `latest-1000` 对比 | 分块结果 ≥ 窗口结果;AC-29 计数取分块值 | AC-29 |
| TC-19 | 溯源一致性 | 已转移/已验票票 | `provenance` 与 `Transfer`/`TicketIssued` 日志、Etherscan 对照 | 五元组一致;`mintedAt` 与区块时间一致 | AC-38/AC-39 |
| TC-20 | 路由守卫/深链/刷新 | 构建产物 | 未连接开 `/tickets`;直接开 `/shows/0` 刷新;F1 开 `/admin/*`;开 `/nope` | 重定向/深链可用/越权重定向/404 | AC-12/AC-28 |
| TC-21 | 交易锁与在途状态 | 任一写操作 | 弹窗期间连点 5 次;pending 时跳转路由 | 只发 1 笔;跳转不丢状态 | AC-14/AC-15 |
| TC-22 | 错误解码覆盖 | 合约就绪 | 触发 §4.7 中至少 6 条 revert,检查 UI 原文 | 原文原样显示 + 中文解释;无白屏 | AC-27 |
| TC-23 | 空态/错误态覆盖 | 新钱包/断网 | 无票、无演出、无收入、断网、限流 | 空态有 CTA;错误态有 Retry | AC-22/AC-23 |
| TC-24 | 演示动线彩排 | 全功能就绪 | 按 C-5 动线走 2 遍(含三策略与预存) | ≤15 分钟;live demo 无阻塞;兜底录屏可用 | AC-40 |

## 7.6 覆盖矩阵

### 7.6.1 功能 × AC/TC

| F 编号 | 功能 | 优先级 | 状态 | 覆盖 AC/TC | 备注 |
|---|---|---|---|---|---|
| F-01 发布演出 | 发布(含策略/门槛) | M | 本期必做 | AC-01、AC-17、TC-03/04/05 | — |
| F-02 调整票价 | 调价(开售前) | M | 本期必做 | AC-33、TC-06 | 开售后冻结 |
| F-03 开售/停售 | 开售/停售 | M | 本期必做 | AC-02、AC-03、TC-06 | 开售即冻结规则 |
| F-04 票房提现 | 票款提现 | M | 本期必做 | AC-11、AC-26、TC-13 | 不含保证金池 |
| F-05 控制台概览 | 四块口径 | M | 本期必做 | AC-29、AC-28 | — |
| F-06 海报墙 | 列表 | M | 本期必做 | AC-17、AC-25 | 含策略/门槛标签 |
| F-07 详情页 | 详情 | M | 本期必做 | AC-18、AC-24 | 含预存资格 |
| F-08 钱包/角色路由 | 连接与路由 | M | 本期必做 | AC-12/13/16、TC-20 | — |
| F-09 购票 | 原子结算+限购 | M | 本期必做 | AC-02/04/05/06/24/25 | — |
| F-10 我的票夹 | 持票 | M | 本期必做 | AC-19、AC-28、TC-17 | 按所有权枚举 |
| F-11 链上 SVG 票面 | 票面 | M | 本期必做 | AC-10、AC-21、TC-16 | 四态文案 |
| F-12 验票预检 Check | 零 gas 预检 | M | 本期必做 | AC-20 | — |
| F-13 链上验票 Verify | 验票打标 | M | 本期必做 | AC-07/08/09/27 | — |
| F-14 验票计数与流程校验 | 计数/校验 | S | 本期必做 | AC-27、P-09 | — |
| F-15 转售策略 | Closed/Open/Detect | M | 本期必做 | AC-30/31/32/33、TC-07…10 | 商家按演出配置(属性) |
| F-16 限价转售市场 | 二级市场 | S | 后续/建议 | 见 §1.3 | 需托管/撮合 |
| F-17 转赠(指定受赠人) | 转赠 | C | 后续 | 见 §1.3 | — |
| F-19 动态防伪码 | 动态码 | C | 后续/建议 | 见 §1.3 | 需服务端 |
| F-21 搜索/分类 | 搜索 | C | 后续 | 见 §1.3 | 纯前端 |
| F-22 多票档/座位 | 票档 | C | 后续 | 见 §1.3 | 结构扩展 |
| F-23 退票/改期 | 退款 | A | 建议(算法团队可选) | 见 §11.3 | — |
| F-24 POA/纪念徽章 | 出席证明 | C | 后续 | 见 §1.3 | 复用已验状态 |
| F-25 团体票 | 组队入场 | C | 后续 | 见 §1.3 | — |
| F-26 钱包抽象/法币 | AA/入金 | A | 建议(算法团队可选) | 见 §11.4 | — |
| F-27 预存门槛 | 防机器人预存 | M | **本期必做** | AC-34/35/36/37、TC-11/12/13 | 启用由商家配置(属性) |
| F-28 票据溯源 | 溯源 | M | **本期必做** | AC-38/39、TC-19 | 含 `TicketIssued` 事件 |
| F-18 身份层/KYC | 身份 | A | 建议(算法团队可选) | 见 §11.1 | 合规敏感 |
| F-20 抽签/VRF | 公平分配 | C | 建议(算法团队可选) | 见 §11.2 | 外部依赖 |
| F-29 拍卖式发售 | 拍卖 | A | 建议(算法团队可选) | 见 §11.5 | 与反溢价冲突 |
| F-30 自由加价二级市场 | 二级市场 | A | 建议(算法团队可选) | 见 §11.6 | 资金/争议 |
| F-31 机器人检测/风控 | 风控 | A | 建议(算法团队可选) | 见 §11.7 | 链下+链上 |
| F-32 实名+人脸核验 | 强核验 | A | 建议(算法团队可选) | 见 §11.8 | 生物识别合规 |

### 7.6.2 页面 × AC/TC

`P-01`:AC-12/13/16、TC-20 · `P-02`:AC-17/25 · `P-03`:AC-02/04/05/06/18/24/25/34/37 · `P-04`:AC-14/15/27 · `P-05`:AC-19/21/28、TC-17 · `P-06`:AC-10/21/38/39、TC-16/TC-19 · `P-07`:AC-01/17/25/30…AC-33、TC-03/04/05 · `P-08`:AC-03/33、TC-06 · `P-09`:AC-07/08/09/20/27/32 · `P-10`:AC-11/26/29 · `P-11`:AC-13/14/22/23、TC-20/TC-23 · `P-12`:AC-34…AC-37、TC-11/12。

---
# 8. 非功能需求

## 8.1 性能

| 指标 | 要求 | 说明 |
|---|---|---|
| 首屏(P-02) | 本地预览 ≤2 秒可交互;链上数据到达前显示骨架 | 3 场演出:1 次 `showCount` + 3 次 `shows` 并行 |
| 读并发 | 同批读 `Promise.all`;单页首屏 `eth_call` ≤ `5 + N` | 避免串行瀑布 |
| 写确认 | `tx.wait(1)`;正常数秒~1 分钟,慢时记录到 README | 不按固定秒数判失败 |
| pending 反馈 | 点击后 ≤300ms 进入「请在 MetaMask 确认」 | 体验要求 |
| 轮询 | 单票状态 30 秒/次,仅可见页;`document.hidden` 暂停 | §6.3 |
| 事件查询 | 部署区块起分块(5000 区块/块);单次结果 >2000 条停止并提示 | §6.3 |
| 长列表 | `showCount>12` 前端分页 | 非搜索功能 |
| gas | 设计预算见 §4.10;P4 实测后回填 README;报告只引用实测 | — |
| 动画 | 入场/悬停动效不得掉帧;支持 `prefers-reduced-motion` | §8.3 |

## 8.2 安全

### 8.2.1 密钥与配置

- **私钥绝不进入前端/仓库**:前端只通过 MetaMask 签名;部署私钥只允许在本地脚本/环境变量,`.env` 必须 `.gitignore`;
- 合约地址(实现阶段产生)可硬编码到 `src/config.js`,但必须有 `isAddress` 校验与配置缺失提示;
- 前端 ABI 最小化:不暴露 `transferOwnership`/`renounceOwnership` 入口;转移仅由合约策略约束;
- 不引入第三方统计/广告脚本。

### 8.2.2 权限与策略不变量(必须写进技术方案)

| 不变量 | 说明 | 验收 |
|---|---|---|
| `onlyOwner` 边界 | 发布/调价/开售/停售/验票/提现仅 owner;前端隐藏不构成安全边界 | AC-09/AC-26 |
| 规则冻结 | `openSale` 后 `rulesFrozen=true`;策略/门槛/票价不可变 | AC-33 |
| 一钱包一演出一票 | `hasBought` 在 `buy` 时置位,不随转移清除 | AC-06/AC-19 |
| Closed 不可转移 | `_update` 拦截所有非铸造转移 | AC-30 |
| Detect 入场拒绝 | `verify` 比较 `ownerOf` 与 `mintHolder` | AC-32 |
| 资金隔离 | `balance == ticketRevenue + totalStaked`(stake/unstake/buy/verify/withdraw 后均成立);owner 不可提保证金 | AC-11/AC-35/TC-13 |
| 预存资格 | 仅当 `minStake>0` 校验 `stakeOf` 与冷却 | AC-34/AC-37 |

### 8.2.3 重入与外部调用

- `buy()`:先写状态(`hasBought`/`ticketOf`/`tokenShow`/`mintHolder`/`mintedAt`/`ticketRevenue`)再 `_safeMint`(可能回调接收方合约)→ 状态先于外部调用,重入再 `buy` 被 `hasBought` 拦截;
- `withdraw()`/`unstake()`:先减少内部记账(`ticketRevenue`/`totalStaked`/`stakeOf`)再转账(checks-effects-interactions);推荐 `call{value:}` + 检查返回值,或 `transfer` 并说明 2300 gas 限制;
- `verify()`:无外部调用;
- 禁止在接收方回调中执行依赖余额的逻辑。

### 8.2.4 revert/异常处理

- 前端必须解码并显示 revert 原文(AC-27);不得静默吞错;
- 所有写路径 catch 必须释放 tx lock、恢复按钮;
- 不自动重试写交易(避免重复扣款/重复铸造);
- 读失败显示 P-11 错误态 + Retry。

### 8.2.5 输入注入与数据完整性

合约 `tokenURI()` 用 `abi.encodePacked` 手工拼 JSON/SVG,**必须对演出名/地址等外部字符串做转义或严格输入校验**(否则票面 JSON/SVG 非法):

| 风险 | 后果 | 缓解 |
|---|---|---|
| 名称含 `"`/`\` | JSON 非法 → 票面解码失败 | 合约内转义(推荐)或前端 V-07 禁止 + README 说明 |
| 名称含 `<`/`>`/`&` | SVG/XML 非法 | 同上 |
| 超长名称/海报 | gas 激增、可能超限 | 前端长度限制(名称 ≤64 字符;poster 建议相对路径) |
| 海报 URL 任意字符串 | 可存怪异协议 | `<img>` 不执行脚本;仍建议 http(s)/相对路径;`onError` 降级 |
| DOM XSS | React 文本节点自动转义 | **禁止** `dangerouslySetInnerHTML` 渲染链上字符串 |

### 8.2.6 依赖与供应链

- 依赖锁定(`package-lock.json` 或 pnpm-lock);不升级到未评估的大版本;
- 依赖最少化:前端仅 React/Vite/ethers/react-router-dom;合约仅 OpenZeppelin Contracts 5.x;
- 不引入后端/数据库/服务端密钥。

## 8.3 可访问性

- 语义化标签;按钮用 `<button>`、跳转用 `<a>`;标题层级不跳级;
- 键盘可达;`ConfirmDialog` 焦点圈定 + Esc 关闭;可点击卡片支持 Enter/Space;
- P-04 `aria-live="assertive"`;Toast `aria-live="polite"`;错误 `role="alert"`;
- 对比度 ≥4.5:1;状态不能只靠颜色(徽章同时有文字);
- 海报 `alt`;纯装饰 `alt=""`;票面 `alt` 含演出名+状态;
- `prefers-reduced-motion` 关闭动效;200% 缩放无横向滚动;
- 输入均有可见 label 或 `aria-label`,错误用 `aria-describedby` 关联。

## 8.4 浏览器兼容与运行环境

| 项 | 要求 |
|---|---|
| 浏览器 | 桌面 Chromium 系(Edge/Chrome)+ MetaMask;Firefox 不承诺;Safari/移动端不支持(无扩展) |
| Node.js | ≥20.19(Vite 7 要求);构建通过 `npm run build` |
| 屏幕 | 桌面 ≥1280×720 为主;1024 宽可用;≤640 单列可用 |
| 语言 | UI 英文为主 + 必要中文提示;不依赖服务端时区 |

## 8.5 网络(Sepolia、水龙头、切链)

| 项 | 要求 |
|---|---|
| 网络 | Sepolia,chainId `11155111`(0xaa36a7) |
| RPC | 通过 MetaMask 注入 provider;不自建/不硬编码公共 RPC |
| 切链 | `wallet_switchEthereumChain`;4902 → `wallet_addEthereumChain`(§12.4);拒绝→P-11 提示,写按钮禁用 |
| 监听 | `chainChanged`/`accountsChanged` 必须处理 |
| 水龙头 | 实现/演示阶段需测试 ETH;P4 须提前实测可用渠道并为 3+ 钱包准备,把渠道与领取记录写入 README/测试记录(本文不写死渠道与余额;不以未核实的水龙头政策作为事实) |
| 稳定性 | 慢确认/限流:P-04 不误判失败、P-11 有 Retry;演示准备备用钱包与录屏兜底 |

## 8.6 代码仓库与 README

| 要求 | 说明 |
|---|---|
| 仓库结构 | `contracts/`、`scripts/`(编译/部署)、`test/`、`src/`、`README.md` |
| README 必含 | ①项目简介与四层架构;②合约地址 + 部署交易哈希 + 部署区块 + 编译器版本;③本地运行命令;④三策略与预存门槛的演示步骤;⑤AC 执行记录索引与 revert 证据;⑥已知边界(§1.6)与 A 类建议说明 |
| 测试 | Foundry/Hardhat 合约单测覆盖 AC-01…AC-39 的合约层;前端手工 E2E 清单覆盖 UI 类 AC |
| 提交规范 | 分支 + 提交信息带角色前缀(`[P1] feat: ...`),支撑贡献分工证据(C-4) |
| 禁项 | 不提交 `.env`/私钥;不伪造截图与 tx 记录 |

---
# 9. 里程碑与依赖

## 9.1 里程碑总表

| 里程碑 | 时间(建议) | 目标 | 输入 | 输出 | 验收 | 负责人 |
|---|---|---|---|---|---|---|
| **M0 设计冻结** | 10-19 ~ 10-20 | 本文档 v2.1 定稿、01 产品设计同步 | canon v2.0、CHANGE-MEMO、本文各轮版本(v2.0/v2.1) | 本文 v2.1 + 01/02 口径一致确认 | 无 high;P1-P4 会签 | P5+Lead;P1-P4 |
| **M1 合约最小闭环(I1)** | 10-20 ~ 10-24 | 部署可购票/验票/提现的合约 | §4.1-§4.3、§4.8 I1 | `contracts/(合约源码文件)` v1 + 部署脚本 + 部署记录(address/tx) | AC-01…AC-09、AC-11、AC-24 合约层通过 | **P1**(主)+P4 |
| **M2 策略/门槛/溯源(I2+I3)** | 10-24 ~ 10-28 | 三策略、预存冷却、溯源完整 | §4.2/§4.9、canon §6/§8 | 合约 v2 + Foundry 单测(不变量) | AC-30…AC-39 合约层通过 | **P1**(主)+P4 |
| **M3 前端实现** | 10-20 ~ 10-29 | 12 页面 + 路由 + 交易状态机 + 预存/策略展示 | §3、§5、§6 | 前端源码 + mock 数据 + 联调记录 | 页面/路由/空错态/可访问性自查通过 | **P2**(主)+P3 |
| **M4 联调与 AC 验收** | 10-28 ~ 11-02 | 前后端联调 + 全量 AC 执行 | M2 合约 + M3 前端 | AC-01…AC-40 执行记录 + revert 证据 + bug 清单 | AC 通过率 100%(A 类除外);high bug=0 | **P4**(主)+P1/P3 |
| **M5 证据与 README** | 11-01 ~ 11-04 | §1.5 证据清单落盘 | M4 记录 | README(地址/tx/证据/已知边界)+ 截图集 | §1.5 EV-1…EV-10 齐全 | **P4** + P5 |
| **M6 报告/视频/提交** | 11-03 ~ 11-08 | 三件套提交 | M5 交付物 + 报告章节 | 视频(≤15min 英文 live demo)+ PDF 报告 + 仓库 | 彩排 2 次通过;三件套齐全 | P5 + 全组 |

## 9.2 依赖关系与关键路径

```text
M0 设计冻结
 ├─► P1 合约 I1(M1)─► I2/I3(M2)─┐
 ├─► P2 前端 mock(M3)───────────┼─► M4 联调验收 ─► M5 证据/README ─► M6 提交
 └─► P3 集成(ABI/钱包/交易机)──┘
```

**关键路径**:`合约 I1 → 前端联调 → 三策略/预存 AC → 证据`。风险最高的是 M2 的合约逻辑(策略拦截、资金隔离)与 M4 的 Sepolia 执行(测试币/慢块/账户绑定)。

**接口冻结点(M0 后不可轻改)**:①§4 函数签名/事件(实现可微调但语义不变);②`src/config.js` 常量(chainId/DEPLOY_BLOCK/ABI);③路由表与守卫;④`useTx`/`WalletContext` 接口;⑤错误码→UI 状态映射。

## 9.3 负责人交付物

| 角色 | 交付物 | 验收人/时间 |
|---|---|---|
| P1 | 合约源码 + 部署脚本 + Foundry 单测(含资金隔离不变量)+ ABI 冻结 | P4/Lead;M1/M2 |
| P2 | 12 页面 + 路由 + 公共组件(策略/预存/冷却/溯源)+ 可访问性 | P3+P4;M3 |
| P3 | WalletContext、useTx、事件分块、错误解码、策略判定、联调记录 | P2+P4;M3 |
| P4 | 测试计划与执行记录、Sepolia 证据、README、水龙头与演示预案 | Lead;M4/M5 |
| P5 | 产品设计对齐、演示脚本、报告素材、贡献分工统稿 | Lead;M0/M6 |

---
# 10. 开放问题与风险

## 10.1 待决策事项总览

| 编号 | 问题 | 影响 | 建议 | owner/截止 |
|---|---|---|---|---|
| OQ-01 | 部署区块号/部署交易哈希在实现前不存在,事件查询的 `fromBlock` 如何配置 | P-05 枚举、AC-29 事件计数 | 部署后立即把区块号写入 `src/config.js` 的 `DEPLOY_BLOCK` 并写入 README;首次部署前用 `latest-5000` 仅作临时开发兜底(不得用于验收) | P1/P4;M1 完成时 |
| OQ-02 | `STAKE_COOLDOWN` 定值 | 冷却时长影响 UX 与 AC-37 | 建议 600 秒;部署时定值并写入 README;若调整需同步 AC-37 测试 | P1;M0 |
| OQ-03 | `MIN_STAKE_FLOOR` 定值及是否在合约内校验 | 门槛过低失效、过高影响体验 | 建议 0.001 ETH;前端强制;合约是否加校验需与 canon §8 同步后再定 | P1+P5;M1 |
| OQ-04 | 是否禁止「验票后转移」 | Detect 策略票面不一致(§4.6.3 第 2 条) | 建议实现禁止(加 revert 需同步 canon);否则在 README 披露 | P1;M2 |
| OQ-05 | `minStake` 非法值(如 1 wei)是否 revert | 商家误配导致门槛失效 | 前端强制地板;合约可选校验(OQ-03) | P1/P2;M2 |
| OQ-06 | `withdraw()` 票款为 0 的行为 | AC-11 边界 | 建议 revert `"Nothing to withdraw"` 或前端禁用;需与 canon 同步文案 | P1;M1 |
| OQ-07 | 场馆角色是否做一次性授权扩展 | §2.1 验票权限口径 | 建议本期 `onlyOwner`;若做扩展需新增接口/事件并在 README 说明 | P1+P5;M0 |
| OQ-08 | 海报资源托管(自托管/URL/IPFS) | 票面 poster 稳定性与 gas | 建议自托管静态资源 + 相对路径上链;IPFS 属后续 | P2;M3 |
| OQ-09 | 前端是否引入状态库(React Query 等) | 复杂度/一致性 | 建议不引入,用 hook + Context(§5.4);如需引入须在技术方案说明 | P2/P3;M0 |
| OQ-10 | 演示用钱包与测试币来源 | M4/M6 阻塞 | P4 维护 3+ 钱包余额台账;水龙头渠道实测后写 README(不写死余额) | P4;M4 前 |
| OQ-11 | A 类功能是否尝试实现 | 交付范围 | 默认不实现;若算法团队有余力,按 §11 卡片的接口建议实现并单独验收,**不得影响 M4 AC 进度** | P5/算法团队;M2 前决定 |
| OQ-12 | 事件计数与 `nextTicketNo` 交叉校验不一致时的处理 | AC-29 | 以事件计数为准并提示「数据异常」;不一致需查 RPC 分块完整性 | P4;M4 |

## 10.2 实现风险登记册

| 编号 | 风险 | 概率 | 影响 | 缓解 | owner |
|---|---|---|---|---|---|
| R-01 | 策略拦截放在 `_update` 时误伤铸造/授权路径 | 中 | 高 | 仅对「非铸造转移」且 Closed 生效;Foundry 覆盖铸造/转移/授权边界测试 | P1 |
| R-02 | 资金隔离不变量被破坏(owner 提到保证金) | 中 | 高 | 按 §4.9 实现 `ticketRevenue`/`totalStaked`;Foundry 不变量测试(TC-13);AC-35 验证 | P1/P4 |
| R-03 | 预存门槛有效性有限(小号成本低/资金占用高) | 高 | 中 | 门槛仅是「提高成本」而非绝对防机器人;README/报告如实说明;A 类 F-31 风控为增强方向 | P5 |
| R-04 | Detect 策略「已验票后转手」票面不一致 | 中 | 中 | 建议禁止验票后转移(OQ-04);否则在 README 披露 | P1 |
| R-05 | Closed 无法阻止私钥/助记词线下转让 | 高 | 中 | 合约层只能阻止链上转移;身份层缺口属诚实边界(§1.6);报告如实说明 | P5 |
| R-06 | 规则冻结时点争议(开售前未配置好) | 中 | 中 | P-07 必须在开售前完成策略/门槛配置;P-08 开售后隐藏编辑;README 写明 | P2/P1 |
| R-07 | 手工拼 JSON/SVG 未转义导致票面非法 | 中 | 中 | 合约内转义(推荐)或前端强校验 + P-06 错误态;TC-05 覆盖 | P1/P2 |
| R-08 | 事件查询漏查/分块失败导致 AC-29 计数错误 | 中 | 中 | 部署区块起分块;失败时标「估算」并登记环境限制;TC-18 覆盖 | P3/P4 |
| R-09 | Sepolia 水龙头枯竭/测试币不足 | 中 | 高 | 提前囤币、团队互转、备用钱包;P4 台账 | P4 |
| R-10 | 慢确认/网络抖动导致演示翻车 | 中 | 中 | P-04 明确 pending 文案;彩排 2 次;备用录屏 | P3/P4 |
| R-11 | MetaMask 账户绑定/切号问题 | 高 | 高 | 演示动线固定「断开→切号→重连」;P-11 Toast;README 记录 | P3 |
| R-12 | 接口冻结后返工(签名/事件变化) | 中 | 高 | M0 冻结 §4;I1 后只允许新增只读视图;变更需 P1/P2/P3 会签 | P1 |
| R-13 | gas 超预期/合约体积超限 | 低 | 中 | 用自定义 error 替代长 revert 字符串、事件精简;部署前测 gas/字节码;EIP-170 上限 24,576 bytes 内 | P1 |
| R-14 | 时间不足导致 A 类挤占必做 | 中 | 高 | A 类默认不实现;M4 前冻结范围;砍 A 类保交付 | Lead/P5 |

---
# 11. A 类:建议算法团队可选实现

> **定位**:以下 8 项为 canon §4 的 **A 类(建议,算法团队可选)**:**按产品目标可选实现**;**不实现也不影响课程交付**;若实现,须独立验收且不得影响 M4 的 AC-01…AC-40。每项给出目标、接口建议、数据需求、风险与验收建议。
> **禁止表述**:不得写「不做/无法做/课程不要求」;正确表述为「建议按产品目标评估可选实现」。

## 11.1 F-18 身份层 / KYC(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 缓解「一人多钱包」与转售黄牛;为限购/转售策略提供身份维度 |
| 接口建议 | 链上只存哈希/可验证凭证引用,不存 PII:`setIdentityProof(address wallet, bytes32 proofHash)`(仅授权 verifier);`hasIdentityProof(address)` |
| 数据需求 | 链下 KYC/VC 服务(供应商),proofHash 上链;用户授权与撤回机制 |
| 风险 | 隐私合规(GDPR/个保法)、PII 不上链、供应商锁定 |
| 验收建议 | 具备/不具备证明的钱包在购买或转售时行为不同;可撤回;不影响未启用演出的流程 |

## 11.2 F-20 抽签/公平分配(Chainlink VRF)

| 项 | 内容 |
|---|---|
| 目标 | 抑制开盘瞬时机器人抢购,公平分配热门演出 |
| 接口建议 | `requestDraw(showId)`/`fulfillRandomWords(...)`(VRF Consumer);中签白名单/配额映射 |
| 数据需求 | Chainlink VRF 订阅与回调成本;每场配额参数 |
| 风险 | 外部依赖与回调失败;额外 gas;用户体验(等待开奖) |
| 验收建议 | 抽签可复现验证(randomness 来源可查)、中签可购票、未中签被拒绝 |

## 11.3 F-23 退票 / 改期(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 降低用户风险、提升主办方口碑 |
| 接口建议 | `refund(showId, tokenId)`(规则+时限)、`reschedule(showId, newTime)`;状态位扩展 |
| 数据需求 | 退还比例/时限/手续费规则;与提现资金池的隔离 |
| 风险 | 资金裁决争议、退款与已验票冲突、合规 |
| 验收建议 | 退款后票作废且资金正确、已验票不可退、规则可通过事件审计 |

## 11.4 F-26 钱包抽象 / 法币入金(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 降低 Web3 门槛,让非加密用户可购票 |
| 接口建议 | AA 钱包(ERC-4337)入口 + 法币支付通道回调;链上以代付/中继提交交易 |
| 数据需求 | Paymaster/中继服务、法币清算方、风控 |
| 风险 | 托管与合规、代付资金风险、复杂集成 |
| 验收建议 | 新用户无需持币完成一次演示购票;资金路径可审计 |

## 11.5 F-29 拍卖式发售(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 为稀缺场次提供价格发现机制(作为可选策略) |
| 接口建议 | `startAuction(showId, reservePrice, duration)`/`bid`;与 `buy` 互斥 |
| 数据需求 | 拍卖参数、结算规则、失败退款 |
| 风险 | 与「反溢价」目标冲突;争议与监管敏感 |
| 验收建议 | 拍卖结算正确、退款正确、与定价售卖互斥 |

## 11.6 F-30 自由加价二级市场(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 提供受约束的二级流通(与 F-15 策略协同) |
| 接口建议 | 挂单/撮合/托管;`list(tokenId, price)`/`buyListed(tokenId)`;平台担保 |
| 数据需求 | 托管合约或账户、争议处理流程、费率 |
| 风险 | 资金托管与争议、平台责任、与 Closed/Detect 策略冲突 |
| 验收建议 | 成交后所有权与资金正确、Closed 演出的票不可上架 |

## 11.7 F-31 机器人检测与风控(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 与 F-27 预存门槛组合,提高机器人成本 |
| 接口建议 | 链下风控评分 + 链上白名单/门槛动态化(`setMinStake` 按场次);或提交-揭示/限速 |
| 数据需求 | 行为数据(链上+链下)、隐私合规、实时性 |
| 风险 | 误伤真实用户;数据隐私;中心化风险 |
| 验收建议 | 在演练中可复现「异常账户被提高门槛」且正常账户不受影响;可关闭 |

## 11.8 F-32 实名 + 人脸核验(建议算法团队可选)

| 项 | 内容 |
|---|---|
| 目标 | 场馆级强身份核验(与 F-18 互补) |
| 接口建议 | 链下核验结果 → 链上 proof/attestation;场馆设备读取验证 |
| 数据需求 | 核验服务、隐私与生物识别合规、数据保留政策 |
| 风险 | 合规敏感(生物识别)、隐私、设备依赖;学术上仍可被共享账号绕过 |
| 验收建议 | 核验通过/失败可区分、隐私数据不上链、可撤回/删除 |

> **统一说明**:以上 A 类功能的接口为**建议**,若实现必须新增独立章节的验收与风险说明,且**不得改变 canon §8 目标接口语义**;不实现时,§7 的 AC 执行不受影响。

---
# 12. 附录

## 12.1 目标 ABI 表(实现阶段产出并核对)

> 以下为目标接口的 ABI 条目(实现阶段由 `solc` 产出;验收时以部署合约 ABI 与本表语义一致为准)。

**函数(目标)**:

```text
createShow(string,string,uint256,uint8,uint256) returns (uint256)
setPrice(uint256,uint256)
setResalePolicy(uint256,uint8)
setStakeRequirement(uint256,uint256)
openSale(uint256)
closeSale(uint256)
stake() payable
unstake(uint256)
buy(uint256) payable returns (uint256)
verify(uint256,uint256) returns (bool)
withdraw()
transferFrom(address,address,uint256)
safeTransferFrom(address,address,uint256)
safeTransferFrom(address,address,uint256,bytes)

showCount() view returns (uint256)
shows(uint256) view returns (string,string,uint256,bool,bool,uint8,uint256,uint256)
owner() view returns (address)
ownerOf(uint256) view returns (address)
hasBought(address,uint256) view returns (bool)
mintHolder(uint256) view returns (address)
used(uint256) view returns (bool)
ticketOf(address,uint256) view returns (uint256)
tokenURI(uint256) view returns (string)
provenance(uint256) view returns (address,address,address,uint256,bool)
stakeOf(address) view returns (uint256)
stakeSince(address) view returns (uint256)
tokenShow(uint256) view returns (uint256)
ticketRevenue() view returns (uint256)
totalStaked() view returns (uint256)
STAKE_COOLDOWN() view returns (uint256)
MIN_STAKE_FLOOR() view returns (uint256)
issuer(uint256) view returns (address)
mintedAt(uint256) view returns (uint256)
name() view returns (string)
symbol() view returns (string)
balanceOf(address) view returns (uint256)
supportsInterface(bytes4) view returns (bool)
```

**事件(目标)**:`ShowCreated`、`PriceUpdated`、**`ResalePolicyUpdated`**、**`StakeRequirementUpdated`**、`SaleToggled`、`Staked`、`Unstaked`、`TicketBought`、**`TicketIssued`**、`TicketVerified`、`Withdrawn`(签名见 §4.5)+ ERC-721 `Transfer`/`Approval`/`ApprovalForAll` + `OwnershipTransferred`。

> **实现差异记录**:若 P1 调整签名/新增只读视图,必须在 README 的「Interface changes」记录,并同步 P3 的 ABI 与 §7 验收步骤。

## 12.2 文字线框图索引

各页线框已在 §3 给出:P-01 §3.1;P-02 §3.2;P-03 §3.3;P-04 §3.4;P-05 §3.5;P-06 §3.6;P-07 §3.7;P-08 §3.8;P-09 §3.9;P-10 §3.10;P-11 §3.11(组件表);P-12 §3.12。全局设计令牌与布局见 §3.0.2。

## 12.3 状态机图

```text
购票成功(buy) → S0 UNUSED · VALID(holder == mintHolder)
   │ verify() 成功                                  │ 转移(策略 Open)
   ▼                                                ▼
S1 VERIFIED · ADMIT                         S0' TRANSFERRED · ADMISSIBLE ──verify()──► S1
                                                    │ 转移(策略 Detect)
                                                    ▼
                                            S2 RESOLD · NOT ADMISSIBLE ──verify()──► revert "Resale not permitted"
Closed 策略:任何非铸造转移 → revert "Resale not permitted"(停留 S0/S1)
```

## 12.4 网络参数与部署命令

| 项 | 值 |
|---|---|
| 网络 / chainId | Sepolia / `11155111`(`0xaa36a7`) |
| 浏览器 | `https://sepolia.etherscan.io` |
| RPC | 通过 MetaMask 注入 provider;不自建公共 RPC |
| 切链参数(`wallet_addEthereumChain`) | `{ chainId: "0xaa36a7", chainName: "Sepolia", nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 }, rpcUrls: [由团队配置], blockExplorerUrls: ["https://sepolia.etherscan.io"] }` |
| 合约地址 / 部署 tx | **实现阶段产生**:部署后写入 `src/config.js` 与 README(EV-1);本文不预设 |
| 部署区块 | 部署后写入 `src/config.js` 的 `DEPLOY_BLOCK`(事件查询起点,OQ-01) |

**部署与构建命令(目标流程)**:

```powershell
# 依赖与编译(实现阶段按团队选型:Foundry 或 Hardhat)
npm install
npx hardhat compile            # 或 forge build
# 部署(Sepolia)
npx hardhat run scripts/deploy.js --network sepolia    # 或 forge script ...
# 前端
npm run build && npm run preview -- --host             # http://127.0.0.1:4173
```

> 实现阶段必须以实际选型替换命令,并把「部署地址 + 交易哈希 + 区块号 + 编译器版本」写入 README(AC-01/AC-40)。

## 12.5 证据与口径索引

| 材料 | 用途 |
|---|---|
| `deliverables/00-shared/canon.md` v2.0 | 唯一真源:F/P/AC/状态词/状态机/目标接口/定位/诚实边界 |
| `deliverables/00-shared/CHANGE-MEMO-2026-10-19.md` | 本轮重构指令(U1–U8 与 §4 改稿清单) |
| `COMP7610+Project.pdf` | 课程硬性要求(C-1…C-8 来源) |
| `docs/related-works/04-可引用数据表.md` | 调研数字引用(本技术文档未使用市场数字) |
| `deliverables/01-product-design/product-design.md` | 产品设计口径(F/P 功能卡、定位推导) |
| 报告文档(03/04) | 报告叙事口径(本文不承担) |

---
> **文档结束**。本文全部内容为「待实现规格」:不含既成事实;状态词严格使用 canon 四词;历史版本文档口径不适用于本文。任何使用本文的后续工作(实现、报告、视频、README)必须保持同一口径,不得把「待实现」写成「已完成」。



