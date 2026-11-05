# LivePass 测试规范

本文件约束 `tests/` 与 `contracts/test/` 下**后续所有测试文件**的拟定方式：分层职责、技术栈、命名、数据、隔离、Mock、断言、清理与准入标准。所有规则均提炼自现有 35 项测试的实际做法（基线见 §1），新测试应保持同一风格；与本文冲突的写法合入前须先修订本文。

当前角色约束：测试工程师**不修改产品源码**。测试发现缺陷时记录缺陷并上报，不得改 `src/`、`contracts/src/` 或生成文件（`src/livepass/contract.ts`、`contracts/abi/`）来迁就测试。

## 1. 测试体系现状基线

| 目录 | 运行命令 | 并发模型 | 环境 | 用例数 |
| --- | --- | --- | --- | --- |
| `tests/` | `npm.cmd test`（即 `node --test tests/*.test.mjs`） | 文件级并行（默认） | 纯 Node，无 EVM | 22（wallet 7 + model 5 + model-edge 4 + discover 6） |
| `contracts/test/` | `npm.cmd run contracts:test`（`node --test --test-concurrency=1 test/*.test.mjs`） | **强制串行** | 本地 EVM（hardhat EDR） | 36（合约/部署 22 + 费率 3 + 前端及钱包集成 11） |

- 运行环境：Node.js ≥ 24（仓库基线为 26），Windows PowerShell 用 `npm.cmd`。
- 两处均**不访问 Sepolia 或任何公共 RPC**、不使用私钥；公开链验收属于 `contracts/scripts/inspect-sepolia.mjs` 只读脚本，不计入本测试体系。
- 新测试文件放入目录后即被 glob 捕获，无需改 package.json；**新增用例后必须同步更新根 README 中的用例计数声明**（当前为"22 项钱包/数据、36 项合约/费用/前端集成"）。

## 2. 分层职责与放置规则

| 判定条件 | 放置位置 | 现有范例 |
| --- | --- | --- |
| 纯函数：输入 → 输出/抛错，可用直接调用表达 | `tests/` | `tests/livepass-model.test.mjs` |
| 控制器行为，可用 EIP-1193 mock provider 完整模拟，不需要交易回执 | `tests/` | `tests/wallet.test.mjs` |
| 需要真实交易回执、事件、revert 证据、重入/对抗行为、跨区块 | `contracts/test/` | `contracts/test/livepass.test.mjs` |
| 需要前端控制器（`LivePassClient`）与 EVM 联动 | `contracts/test/` | `frontend.test.mjs`、`revenue-frontend.test.mjs` |

判定口诀：**能 mock 则 mock（快、并行），必须看链上证据才进 EVM（慢、串行）**。禁止把纯函数测试放进 `contracts/test/` 拖慢串行队列。

## 3. 技术栈与依赖约束

1. 测试框架：**仅限 `node:test` + `node:assert/strict`**。禁止引入 jest / vitest / mocha / chai / sinon 等新依赖（与合约工程"独立 lock 隔离工具链"的原则一致）。
2. TypeScript 源文件用**显式 `.ts` 后缀直接导入**（如 `import { WalletController } from '../src/wallet/controller.ts'`，参照 `tests/wallet.test.mjs:3`）。因此被测源码必须保持可擦除语法（不得出现 enum / namespace / 参数属性）。
3. ethers 仅可使用仓库已锁定的 v6 API；合约测试通过 `import hre from 'hardhat'` + `hre.network.create('hardhatMainnet' | 'frontendTest')` 建立隔离 EVM（网络定义见 `contracts/hardhat.config.js`，`frontendTest` 使用 chainId 11155111 模拟链，**不会连 Sepolia**）。
4. 合约 artifact 统一从 `contracts/deployments/sepolia-build/LivePass.json` 读取（`frontend.test.mjs:35` 的做法），保证测试的是**实际部署构建**，而不是另编一份。

## 4. 文件与用例命名规范

- 文件名：`<主题>.test.mjs`，小写连字符，一文件一主题（如 `wallet`、`livepass-model`、`revenue-frontend`）。
- 用例标题：**一句行为陈述，含预期结果**，可并列负面条件。现有范例：
  - `'AC-07/08/09/31: Open transferee can enter once, wrong show/token rejected'`（`livepass.test.mjs:165`）
  - `'revenue events survive withdrawal; deposits, permissions, stale snapshots and RPC failures stay safe'`（`revenue-frontend.test.mjs:9`）
- 合约用例标题必须带 **AC 编号前缀**（课程验收条款，格式 `AC-01` 或 `AC-02/04/05`），无 AC 对应的新增场景用 `regression:` 前缀。
- 标题用英文（与现有一致）；断言中的**面向用户文案保持中文原文**（产品文案即中文，如 `/票款已变化/`、`'已取消钱包请求'`）。
- 禁止空泛标题（`'test buy'`、`'case 3'`）。

## 5. 标准测试数据字典

新增测试**必须优先复用**下表数值，保持与 Sepolia 验收口径一致；确需新值时同步登记到本表。

| 语义 | 标准值 | 出处 |
| --- | --- | --- |
| 合约测试票价 | `parseEther('0.01')` | `livepass.test.mjs:9` |
| 前端集成票价（对齐 Sepolia 实测） | `parseEther('0.0001')` | `frontend.test.mjs:44` |
| 保证金地板 / 存入金额 | `parseEther('0.001')` | `livepass.test.mjs:10` |
| 前端集成存款 | `parseEther('0.001')` 或 `parseEther('0.003')` | `frontend.test.mjs:76`、`revenue-frontend.test.mjs:36` |
| 冷却期 | 读合约常量 `STAKE_COOLDOWN`（600s）；边界用 `start+599 / start+600` | `livepass.test.mjs:217-222` |
| 钱包测试地址 | `0x0000000000000000000000000000000000000001`（A）、`...0002`（B） | `wallet.test.mjs:5-6` |
| 模拟余额 | `'0xde0b6b3a7640000'`（= 1.0 ETH） | `wallet.test.mjs:9` |
| 正确/错误链 | `'0xaa36a7'` / `'0x1'` | `wallet.test.mjs:3,44` |
| 编号体系 | showId 从 0；tokenId 全局从 1；每场票号从 1 | 合约 canon |
| 演出名样例 | `'LivePass 演出'`（含中文）、`'演'.repeat(64)` 上限 | `livepass.test.mjs:26,110` |
| 跨段区块 | `hardhat_mine ['0x3ed']`（1005 块，跨越 1000 块分段） | `revenue-frontend.test.mjs:42` |
| 混合资金序列 | 60 步，LCG 种子 7610（`seed * 1664525 + 1013904223 >>> 0`） | `livepass.test.mjs:294-311` |

**恶意输入语料**（安全类用例统一引用，禁止临时拼凑）：

| 类别 | 语料 |
| --- | --- |
| 非法演出名 | `''`、`' '`、`' Show'`、`'Show '`、`'x'.repeat(65)`、`'A"B'`、`'A\\B'`、`'<script>'`、`'A&B'`、`'A\nB'`、`'A\x7fB'`、孤立代理项 `'\ud800'` |
| 非法 UTF-8 | 手工 ABI 字节 `c080`（overlong 编码，绕过 ethers 编码层） |
| 非法海报 | `'javascript:alert(1)'`、非 HTTPS URL |
| 非法 SVG | `'<svg onload="alert(1)"/>'`、外链 `https://…/track.svg` |
| 非法金额 | `'1e-3'`、`'-1'`、`'0'`、`'NaN'`、`'01'`、19 位小数 |

## 6. 隔离、确定性与并发规范

1. **每用例新合约**：`beforeEach` 内重新部署（`livepass.test.mjs:19-23`），用例间零共享状态。
2. **串行约束**：`contracts/test/` 必须保持 `--test-concurrency=1`（多个 EDR 实例并行会竞争编译缓存与节点资源）；`tests/` 走默认文件级并行，因此**每个文件必须自包含**，不得依赖其他文件留下的全局态。
3. **时间锚定**：冷却/时间边界一律用 `evm_setNextBlockTimestamp` 锚定到存款区块（`:217` 的 `start+599/start+600`），禁止依赖墙钟漂移的 `evm_increaseTime` 边界断言。
4. **区块控制**：需要跨区块分段时用 `hardhat_mine`，需要推进时间用 `advance(seconds)`（`evm_increaseTime` + `evm_mine`）。
5. **随机必须确定性**：混合操作序列用固定种子 LCG（§5）；禁止 `Math.random()`。
6. **异步等待**：禁止裸 `setTimeout` 表达"等一会儿"（引入 flaky）；统一用 `tick()`（15–30ms）+ `until(condition)`（300 次轮询超时即 fail，`frontend.test.mjs:9-13`）。

## 7. Mock 与注入模式（标准模板）

### 7.1 EIP-1193 注入 provider（tests/ 与 contracts/test/ 通用）

参照 `wallet.test.mjs:8-28` / `frontend.test.mjs:22-31`，必备要素：

```js
let account = accounts[0], chain = '0xaa36a7', reject = false, sends = 0;
const injected = {
  on(event, fn) { listeners.set(event, fn); },
  removeListener(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
  async request(req) {
    if (['eth_accounts', 'eth_requestAccounts'].includes(req.method)) return [account];
    if (req.method === 'eth_chainId') return chain;
    if (req.method === 'eth_sendTransaction') { ++sends; if (reject) throw { code: 4001 }; }
    return rpc.request(req);           // contracts/test/ 版本：转发到本地 EVM
  },
};
```

- 账户/网络切换通过 `listeners.get('accountsChanged')?.()` 主动触发事件，模拟钱包行为。
- 拒签注入统一 `{ code: 4001 }`（4001 / ACTION_REJECTED 归类为中性拒绝）。

### 7.2 RPC 故障与延迟注入（monkey-patch reader）

参照 `frontend.test.mjs:138-148`、`revenue-frontend.test.mjs:80-87`：

```js
const getBlock = reader.getBlock.bind(reader);
reader.getBlock = async () => { throw Error('Test RPC unavailable'); };   // 故障
await client.checkTicket('0', tokenId);
reader.getBlock = getBlock;                                              // 必须还原

const getCode = reader.getCode.bind(reader); let release;
reader.getCode = async (...args) => { await new Promise(r => { release = r; }); return getCode(...args); };  // 挂起
// 触发调用 → 制造状态切换 → release() 放行 → 断言旧响应被丢弃
reader.getCode = getCode;
```

规则：patch 必须**用后即还原**（放 finally 亦可）；挂起注入用于构造"迟到响应"，断言目标是过期数据不覆盖新状态。

### 7.3 零签名断言（sends 计数）

只读操作（Check、票房统计、权限拒绝路径）必须断言**没有发生任何 `eth_sendTransaction`**：

```js
const before = sends;
assert.equal(await client.send('Unauthorized verify', 'verify', [...]), false);
assert.equal(sends, before);   // frontend.test.mjs:85-86, 121-123
```

## 8. 断言规范

1. 仅用 `node:assert/strict`；bigint 比较用 `assert.equal`（严格类型，`0n !== 0`），结构与地址数组用 `assert.deepEqual`。
2. **revert 文案断言**：经 `staticCall` 触发，用 `reason(promise, expected)` helper（`livepass.test.mjs:41-46`）比对合约原文（如 `'One ticket per wallet'`、`'Rules are frozen after sale opens'`）；不得只断言"抛错"。
3. **事件断言**：用 `logs(receipt, name)` 解码后断言字段（`livepass.test.mjs:38`）；事件顺序敏感场景（如 `TicketIssued` 先于后续 `Transfer`）用 `findIndex` 比较（`:288-291`）。
4. **资金不变量**：涉及金额的用例结束处调用 `accounted()`（`balance == ticketRevenue + totalStaked`，`:47-49`）；混合序列须**每步**校验（`:308-309`）。
5. **到账断言**：提现/退款用 `余额变化 = 金额 - receipt.fee`（`:233, 245`）。
6. **状态快照断言**：控制器状态用 `client.getSnapshot()` 取值断言，不改用内部私有字段。
7. 交易哈希等格式断言用正则（如 `/^0x[\da-f]{64}$/i`、`/^data:image\/svg\+xml;base64,/`）。

## 9. 竞态 / 幂等 / 防重模式（必须覆盖的场景）

新增交易类功能时，以下场景**必须至少各有一条断言**（对应产品红线）：

| 场景 | 标准写法 | 范例 |
| --- | --- | --- |
| 双击/重复提交 | 并发两次 `send`，第二次返回 `false` 且 `isLocked()` 为真，`sends` 只 +1 | `frontend.test.mjs:59-61, 113-115` |
| 拒签 → 重试 | 注入 4001 → stage 为 `rejected`、锁释放、链上状态未变 → 复发成功 | `frontend.test.mjs:55-58, 109-112` |
| 过期快照失效 | Check/确认后改变输入、账户、网络或链上持有人 → 旧结果作废且**零签名** | `frontend.test.mjs:99-107` |
| 迟到响应丢弃 | 挂起 RPC → 切换状态 → 放行 → 断言状态未被旧数据覆盖 | `frontend.test.mjs:139-143` |
| 另一端并发写 | 本地确认快照后由他方改变链上金额 → 本端拒绝签名（`/票款已变化/`） | `revenue-frontend.test.mjs:76-79` |
| 幂等上链 | 合约层二次操作 revert（重复买/核销/提现），前端在签名前拦截 | `livepass.test.mjs:142, 174`、`revenue-frontend.test.mjs:73` |

## 10. 资源清理规范

EVM/控制器用例统一 `try/finally` 收尾（`frontend.test.mjs:157`、`revenue-frontend.test.mjs:90`）：

```js
let client;
try { /* … */ }
finally { client?.stop(); wallet.dispose(); reader.destroy(); await connection.close(); }
```

- 顺序：`client.stop()`（退订钱包）→ `wallet.dispose()`（解绑 provider 监听）→ `reader.destroy()` → `connection.close()`（关闭 EDR 网络）。
- 监听器清理须可断言：`assert.equal(provider.handlers.size, 0)`（`wallet.test.mjs:55`）。

## 11. 新增测试准入清单（DoD）

合入前逐项自查：

- [ ] 放置目录符合 §2 判定；文件/标题命名符合 §4
- [ ] 数据全部来自 §5 字典（或已登记新值）
- [ ] 覆盖矩阵：**正常路径 + revert（含文案）+ 边界（上下限/恰好等于）+ 竞态或过期 + 幂等防重**（交易类另加资金不变量）
- [ ] AC 编号可追溯（合约层）或 `regression:` 标注（前端层）
- [ ] 无网络访问、无私钥、无新依赖、无 `Math.random()`、无裸 sleep
- [ ] monkey-patch 已还原；`finally` 清理完整
- [ ] 本地实际跑过：`npm.cmd test`（或 `contracts:test`）+ `npm.cmd run typecheck` 通过
- [ ] 根 README 用例计数已同步

## 12. 红线（禁止事项）

1. 禁止测试访问 Sepolia / 公共 RPC / 任何网络（公开链验收只走只读 inspect 脚本，另行记录）。
2. 禁止在测试或 mock 中出现真实私钥、助记词。
3. 禁止为让测试通过而修改产品源码、ABI 或生成文件。
4. 禁止声明未经实际运行的结果；"本地测试通过"不得表述为"Sepolia 实测完成"。
5. 禁止依赖执行顺序或共享可变全局（`tests/` 目录文件级并行）。
6. 禁止用 `Date.now()`/墙钟表达业务时间语义。

## 13. 缺口登记表（Backlog）

已识别缺口的处理状态；新文件一律按本规范拟定：

| 优先级 | 缺口 | 状态 |
| --- | --- | --- |
| P0 | `checkPending` 恢复核对、`TRANSACTION_REPLACED` 替换/取消分支、余额不足提示（`client.ts:231-243, 267, 280-285`） | ✅ 已落地：`contracts/test/pending-recovery.test.mjs`（7 用例） |
| P0 | `setApprovalForAll` + Closed 策略、`renounceOwnership` 后管理功能关闭 | ✅ 已落地：`contracts/test/approval-ownership.test.mjs`（4 用例） |
| P0 | UI 组件渲染（禁用条件、确认弹窗流转、错误提示） | ⛔ 阻塞：需引入 `@testing-library/react` + `happy-dom` devDependencies，且 `context.tsx` 含 JSX 无法被 node 直连导入——超出"零新依赖"红线，待决策 |
| P1 | EIP-6963 三级回退发现（`discover.web.ts`） | ✅ 已落地：`tests/discover.test.mjs`（6 用例） |
| P1 | 票夹 Transfer 事件跨 1000 块分段 | ✅ 已落地：`contracts/test/tickets-scan.test.mjs`（2 用例，跨 2000+ 块） |
| P1 | `model.ts` 剩余边界（>100 ETH、带凭据海报、>1MB tokenURI、uint256 上界） | ✅ 已落地：`tests/model-edge.test.mjs`（4 用例） |
| P1 | 30s 轮询 + `visibilitychange`、FallbackProvider 容错（`context.tsx`） | ⛔ 阻塞：含 JSX，同上待决策 |
| P1 | `sync-livepass.mjs` 错误输入 fail-fast | 待实现：child_process + 临时目录副本方案（脚本按自身路径定位仓库根，直接运行会重写生成文件） |
| P2 | `deploy-server.mjs`（Host/Origin 限制、会话 token） | 待实现 |
| P2 | 公开链 Open/Detect 转移、非零保证金隔离验收 | `inspect-sepolia.mjs` 证据扩展（非测试文件，需 owner 钱包配合） |

### 实施备注（已落地文件的经验教训）

- **sessionStorage 桩**：`client.ts` 检查 `typeof window` 但读取**裸全局 `sessionStorage`**（浏览器语义）。测试桩必须同时设置 `globalThis.window` 与 `globalThis.sessionStorage`，否则恢复逻辑被静默吞掉（`pending-recovery.test.mjs` 首版踩坑）。
- **交易替换竞态**：在关闭自动挖矿的本地 EVM 上，ethers `wait()` 的轮询订阅 bootstrap 可能把替换后的链头锚定为基线，导致 "block" 事件永不触发、检测挂起。确定性做法：观察 mock 计数第 2 次 `eth_blockNumber`（bootstrap 完成）后再广播替换交易，并在替换上链后补挖区块。真实网络持续出块，不存在该问题——属测试环境工件，非产品缺陷。

## 附：模式 → 现有实现索引

| 模式 | 位置 |
| --- | --- |
| mock EIP-1193 provider | `tests/wallet.test.mjs:8-29`、`contracts/test/frontend.test.mjs:22-31` |
| `tick`/`until` 轮询 | `contracts/test/frontend.test.mjs:9-13` |
| revert 文案 helper `reason()` | `contracts/test/livepass.test.mjs:41-46` |
| 资金不变量 `accounted()` | `contracts/test/livepass.test.mjs:47-49` |
| 冷却边界时间锚定 | `contracts/test/livepass.test.mjs:216-222` |
| 恶意 UTF-8 手工构造 | `contracts/test/livepass.test.mjs:112-115` |
| 60 步混合序列（确定性） | `contracts/test/livepass.test.mjs:294-311` |
| 跨 1000 块分段断言 | `contracts/test/revenue-frontend.test.mjs:42-50` |
| RPC 故障/迟到注入 | `contracts/test/frontend.test.mjs:138-148`、`revenue-frontend.test.mjs:80-87` |
| 零签名计数断言 | `contracts/test/frontend.test.mjs:81-98` |
| try/finally 清理链 | `contracts/test/frontend.test.mjs:157` |
