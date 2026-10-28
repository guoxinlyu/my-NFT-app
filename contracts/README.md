# LivePass contracts

课程用 Sepolia 票务合约，已于 2026-10-25 部署到 Ethereum Sepolia。链上运行字节码、主办方和初始状态已核对；网页已接入，并完成发布、开售、购票、验票及提现实测。组员审查请先看 [审查指南](../docs/REVIEW_GUIDE.md)。本地测试不是独立安全审计。

## 安装、编译与测试

从仓库根目录运行（使用 Node.js 24 或 26；PowerShell 使用 npm.cmd）：

```powershell
npm.cmd ci --prefix contracts
npm.cmd run contracts:compile
npm.cmd run contracts:test
```

独立 package/lock 避免给 Expo 引入测试工具。固定 Solidity 0.8.38、OpenZeppelin 5.6.1、Hardhat 3.21.0、ethers 6.17.0；编译器使用本地 solc-js，不在测试时下载编译器。优化 200 runs、viaIR=true、EVM Cancun（字节码目标）。本地执行使用 Amsterdam hardfork、2 亿 blockGasLimit，以覆盖 Sepolia 新状态计费；Hardhat 对此 fork 的支持仍为实验性且不完整，实际部署估算以 Sepolia RPC 为准。Hardhat 提供本地 EVM，Node test runner + ethers 发起真实本地交易并检查状态、事件和 revert；没有用模拟函数替代合约执行。测试不访问 Sepolia、不需要钱包或密钥。

- `src/LivePass.sol`：产品合约；唯一构造参数 `initialOwner` 为主办方钱包地址，不能为零地址。
- `test/Adversaries.sol`：仅供本地攻击/失败接收方测试，不能作为产品部署。
- `abi/LivePass.json`：由编译命令生成；网页实际 ABI 和部署配置通过根目录的 `npm.cmd run contracts:sync` 从已验证部署构建同步。
- `artifacts/LivePass.json`：ABI、创建/运行字节码、编译元数据；生成目录不入 Git。
- `artifacts/compiler-input.json`：含依赖源码和编译设置的完整 Standard JSON 输入，用于复现和之后 Etherscan 验证。

运行时字节码检查不能超过 EIP-170 的 24,576 字节。编译后应提交 ABI 变更，不能手工编辑 ABI。

## 实施口径

按项目 canon v2.0 §8 的函数、事件及主要 revert 文案实现；showId 从 0、全局 tokenId 和每场票号从 1 开始。名称/代号为 LivePass/LIVEPASS。

- owner 发布/编辑、开售/停售、验票和提现；owner 也可按相同规则购票。发行方在 createShow 时记录，不随合约 ownership 改变。
- 首次开售永久冻结票价、转售策略、预存门槛，停售和重新开售均不解冻。
- 精确支付票价并原子铸造；拒收 NFT 则整笔回滚。每钱包每场只能首次买一次，转出不清除 hasBought；受让票不会自动写入购买历史。无库存上限，不实现座位/票档。
- Closed 拒绝 transferFrom 和两个 safeTransferFrom 重载（含已授权操作）；Open 受让人可入场；Detect 受让人不可入场，转回首次买家恢复未使用票的资格。转移不证明发生付费交易，不实施转售限价。
- `ticketOf(wallet, showId)` 是首次购买取得的场内票号，不是当前所有权索引；额外只读 `ticketNumber(tokenId)` 保存该 NFT 的原始场内票号。票夹必须查询 Transfer 并回读 ownerOf。
- `STAKE_COOLDOWN=600` 秒，`MIN_STAKE_FLOOR=10^15` wei（0.001 ETH）。minStake=0 关闭该场门槛；否则至少达到地板。预存全局按钱包记账，不消耗、不抵扣票价；新增存入重置全部预存的冷却。部分或全额取回不受冷却限制，全额取回清零 stakeSince。
- onlyOwner 验票，检查票存在、所属演出、未使用和策略；used 永久为 true。按 canon 当前接口，Open/Detect 已核销票仍可转移，used 不重置且票面优先显示 VERIFIED - ADMIT，不能再次入场。禁止验票后转移属于待决定的规则变更，本版没有擅自加入。
- `ticketRevenue` 是当前可提票款，不是历史成交额；`totalStaked` 只能由存款人取回。withdraw 清零并只转出票款，接收失败整笔回滚。购票/预存/退款/提现使用 ReentrancyGuard，退款和提现遵循先更新状态再外部调用。
- 日常受支持的操作保持 balance == ticketRevenue + totalStaked。普通直接转 ETH 会失败；但 EVM 不能阻止所有强制转账，因此一般性的偿付能力不变量是 balance >= ticketRevenue + totalStaked。强制转入余额是 surplus，本版没有回收入口，也不能伪装成票款提现。
- 动态 tokenURI 是 base64 JSON + base64 SVG，含演出名、原始场内票号、tokenId、发行方、首次买家、当前持有人、铸造时间与状态。已核销状态优先；SVG 用 `UNUSED - VALID` / `TRANSFERRED - ADMISSIBLE` / `RESOLD - NOT ADMISSIBLE` / `VERIFIED - ADMIT`。

## 明确的输入保护及边界

除 canon 规定的错误外，本版新增存在性和输入校验：

- 未创建演出：`Show does not exist`；零价：`Price must be positive`。
- 名称须为有效 UTF-8，1–64 Unicode 标量，禁止开头/结尾 ASCII 空格、控制字符及 `"`、反斜杠、`<`、`>`、`&`：`Invalid show name`。这样 JSON/SVG 不会注入名称代码；前端还应 trim 并使用相同校验。
- 海报最长 2048 UTF-8 字节：`Poster too long`；只作为存储字段，不插入 SVG/JSON，不在合约内请求 URL。前端另做 URL 和展示校验。
- 非零预存门槛低于地板：`Stake requirement below minimum`；零金额退款：`Amount must be positive`；空票款提现：`No ticket revenue`；退款/提现接收失败：`ETH transfer failed`。
- 继承标准 ERC721 授权、Ownable 所有权转移及放弃所有权行为。放弃 ownership 会永久关闭全部管理功能，网页不提供入口；Closed 不阻止私钥转让，多钱包也不能靠本合约消除。
- 票无容量、日期、过期、取消、退款或二级市场；不把预存描述为身份认证或机器人彻底防护。

## 本地验收

当前共 34 项测试：18 项合约/部署检查、3 项费率检查、13 项 Web3 与本地真实 EVM 的集成测试。覆盖合约层 AC-01–11（相关部分）、AC-24、AC-30–39；包含 60 步确定性混合资金操作序列。检查权限、非法输入/不存在 ID、永久冻结、精确付款、限购、三策略、重复核销、JSON/SVG、溯源、冷却边界、资金隔离、拒收回滚、重入、安全铸造回调转移及强制 ETH。部署记录器检查网络、字节码、构造参数、回执和初始状态。Web3 集成另覆盖连接前零自动读取、钱包切换、过期请求、预检与核销、售票事件分段统计、确认金额变化、提现后历史统计保留、三种规则编辑、完整溯源与票面，以及交易确认、刷新恢复、加速/取消核对和迟到响应。

这不是完整的随机模糊测试、形式化证明或独立审计；已完成的公开链主流程及尚未覆盖场景见 [审查指南](../docs/REVIEW_GUIDE.md)，不将本地测试计为 Sepolia 实测。

依赖审计：solc 的 tmp 依赖用兼容补丁 0.2.7 override 修复。Hardhat 工具链仍依赖 Zod 3，npm 报告其内存耗尽公告及传递影响；不强制换成不兼容的 Zod 4。本地测试使用可信配置，不向网络暴露 Hardhat 节点；该工具链不进入网页产物或链上字节码。新增工具链审计不能替代 Solidity 审计。

## Sepolia 部署与复现

当前部署（2026-10-25 20:28:00，中国时间）：

- 合约：[0xB49AE6C981503Df11EA0756eE37053e772a3b682](https://sepolia.etherscan.io/address/0xB49AE6C981503Df11EA0756eE37053e772a3b682)。
- 交易：[0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9](https://sepolia.etherscan.io/tx/0xa5e227c8177687ddc4d2cb29433ecf3ef8d42b3606e3792e3e7f2ef6ff1dd3f9)。
- 部署区块：11990862；主办方：`0x2C103c973A73Fc00cb7B315c89A28eFcFD8895E8`。
- 实际 gasUsed：21,694,869；实际费用：0.000003332592216828 Sepolia ETH。
- 链上核对：创建/运行字节码匹配，owner/name/symbol/showCount/冷却/门槛地板初值匹配。部署时 showCount=0；之后已完成 Show #0 发布、开售、Token #1 购票与核销，以及 0.0001 ETH 票款提现，各阶段 JSON 保存在 deployments/。
- 完整证据：`deployments/sepolia.json`；实际构建输入与依赖源码：`deployments/sepolia-build/`。源码公开验证状态以部署记录中的 sourceVerification 为准。
- [Sourcify](https://repo.sourcify.dev/11155111/0xB49AE6C981503Df11EA0756eE37053e772a3b682) 创建/运行字节码均为 exact_match，验证结果保存在 `deployments/sourcify-result.json`。Etherscan 自动同步因共享服务每日 500 次提交限额失败，不等于链上部署失败，也不声称该平台已显示验证标记。
- 如需恢复核对源码验证任务，可运行 `node contracts/scripts/verify-sourcify.mjs`；脚本使用已保存的实际构建与任务 ID，不签名或重部署。

### 使用本机 MetaMask 部署页面

```powershell
npm.cmd run contracts:compile
npm.cmd run contracts:deploy
```

在安装 MetaMask 的 Chrome 中打开 `http://127.0.0.1:8787/`。连接钱包、核对主办方地址和 Ethereum Sepolia 网络、查看预估 Gas，勾选确认并点击部署，在 MetaMask 中亲自确认。页面直接使用本地测试构建，不需要 Remix 重新编译，也不需要输入私钥。连接的部署钱包同时作为 initialOwner。gas 用量取链上 eth_estimateGas 并加 20% 余量；费率从 eth_gasPrice 与最新区块 baseFee 计算，显式发送 EIP-1559 的 maxFeePerGas 和 maxPriorityFeePerGas，不使用可能明显偏高的默认小费。页面区分即时估计和交易费用上限，报价两分钟后需重新核对。

广播后保存交易哈希，禁止重复部署；刷新后可点击「核对并保存已有部署」恢复。若交易被取消或替换，先检查原 nonce 对应的链上结果，不要盲目清除待确认记录再重发。

部署成功后，本机服务使用公开 Sepolia RPC 验证交易、运行时字节码、主办方和初始状态；成功才写入 `deployments/sepolia.json`，并将完整源码依赖、编译输入及产物保存在 `deployments/sepolia-build/`。这些文件不含私钥，应该随项目保存。这里的链上核对不是 Etherscan/Sourcify 源码公开认证，未提交时记录 `sourceVerification=not-submitted`。

本机服务仅监听 127.0.0.1，限制 Host/Origin、会话 token 和请求大小，不提供签名接口。完成后 Ctrl+C 关闭。不要向公网部署此工具。

### Remix 备选步骤

1. 在本地通过上述测试后确定不再修改规则，保存提交与 ABI。
2. 准备 MetaMask 主办方地址与 Ethereum Sepolia 测试 ETH；不要给任何人助记词或私钥。
3. 可在 Remix 导入产品合约，并将 OpenZeppelin 导入锁定为 `@openzeppelin/contracts@5.6.1/...`；使用 0.8.38、Cancun、optimizer=200、viaIR=true，重新编译。保存这个实际部署构建的源码、元数据及编译设置，验证时使用一致的输入；本地原文件与版本化导入的元数据哈希可能不同。
4. Deploy & Run 选择 MetaMask 浏览器钱包，核对 chainId=11155111；构造参数 initialOwner 填主办方地址，在 MetaMask 中亲自确认。
5. 保存真实地址、部署交易哈希、receipt.blockNumber、ABI 和构建设置，随后在 Etherscan 验证源码。
6. 创建三场演出覆盖 Closed/Open/Detect，至少一场开启预存；开售后用另一个钱包完成预存→等待冷却→购票→验票→预存取回/票款提现，记录正例与 revert。
7. 用 `npm run contracts:sync` 同步实际部署资料，再按[测试教程](../docs/TESTING_GUIDE.md)核对网页、钱包及合约状态一致。
