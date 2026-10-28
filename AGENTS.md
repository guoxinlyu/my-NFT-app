# LivePass 项目协作说明

适用于本仓库及子目录。最近更新：2026-10-27。

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
当前实际使用 Expo SDK 58，实现前还需查阅 https://docs.expo.dev/versions/v58.0.0/ 相关 API；版本以 package/lock 文件为准。

## 项目范围

- HKU COMP7610 演唱会 NFT 票务 DApp，仅开发 Web（含手机浏览器），目标为 Ethereum Sepolia，chainId 11155111。
- 架构为 Expo/React、ethers v6、MetaMask、Solidity；业务由合约承担，沿用现有工程，不新增无需求的 REST 服务、数据库或原生 App。
- 默认中文沟通；沿用现有配色、卡片和组件，按任务增量实现，不擅自重设计或扩展业务。
- 避免过度防御编程：在输入、钱包和 RPC 边界做必要校验，复用现有类型、预检和交易流程，不添加无需求的抽象、兜底或自动重试。

## 阅读入口

- 先读 [README](README.md)、[审查指南](docs/REVIEW_GUIDE.md)、package.json 和相关源码；测试操作见[测试教程](docs/TESTING_GUIDE.md)。
- 涉及合约、编译或部署时读[合约说明](contracts/README.md)。
- 涉及前端或业务规则时使用 [LivePass skill](.agents/skills/livepass-frontend/SKILL.md)，按需读取 canon、技术需求和适配说明。
- 技能 references 是早期需求快照；业务冲突按 canon 及适配说明处理，当前实现/进度以代码和证据为准，项目自定指标不等于课程原文。

## 关键约束

- 页面通过 useLivePass() 消费服务；合约调用和签名集中在控制器，复用统一 send 流程和共享 UI。
- 仅 Sepolia 可写，动态读取 owner；角色读取失败不猜测身份。保留路由守卫与目标恢复，未连接/错链时不自动读取合约。
- 金额以十进制字符串转 bigint/wei；精确支付与铸票原子完成。每钱包每场仅能首次购买一次，转出不清除 hasBought；票夹按 Transfer 与 ownerOf 校验当前所有权。
- 首次 openSale 后价格、策略、门槛永久冻结，停售不解冻；三个 setter 均逐项确认后发送。
- Closed 禁转；Open 未使用受让票可入场；Detect 拒绝非首次买家，未使用票转回后恢复资格。Open/Detect 已核销票可转移，used 不重置。
- minStake=0 关闭门槛；非零至少达到链上地板。追加存入重置冷却，取回不受冷却限制，保证金不抵扣票款；常量读链上，倒计时到点须重读资格。
- Check 免费只读，输入/身份/路由变化使其失效；Verify 由 owner 模拟场馆，确认后永久核销，成功回执后更新。
- 可提现仅 ticketRevenue，totalStaked 属保证金；累计张数/成交额按 TicketBought 事件统计，提现不减少历史统计。
- 溯源固定区块读取状态和票面，从部署区块每 1000 区块查询完整 TicketIssued/Transfer；失败不返回部分历史，转移不证明付费交易。
- 普通刷新保留同身份表单和展开状态；实际账户/网络/规则变化清理旧状态与响应。外部状态订阅保留稳定 getServerSnapshot，SVG 使用安全图片源。
- 待确认保留 hash/nonce 与全局锁；核对匹配且已确认的替换交易后恢复，不自动重发。刷新完成前保持锁，迟到响应不能覆盖新结果。
- 保留 SPA 深链与页面回退；构建用 web.output=single，预览用 npm run preview，不用固定假 ID 枚举链上页面。

## 自检与交接

使用 Node.js 24 或 26，Windows PowerShell 可用 npm.cmd。按变更范围执行：

```sh
npm run typecheck
npm test
npm run contracts:test
npm run build
```

- 页面变更补实际交互、桌面/390px 和键盘检查；纯文档核对内容与 git diff --check，无需重跑业务测试。
- 只报告实际运行的结果，区分本地 EVM、隔离浏览器和 MetaMask/Sepolia 实测；具体数量和进度统一维护在审查指南。
- src/livepass/contract.ts 通过 npm run contracts:sync 从实际部署生成；不手改 ABI、地址或部署区块。保留锁文件、实际部署构建和验收证据，不覆盖历史记录。
- 使用 MetaMask 签名，不收集私钥/助记词；本机部署与预览工具不作正式业务服务。保留组员未提交改动，不擅自提交、push 或部署。
- 结束时说明改动、实际验证及待交接事项；不把每钱包限购或票面截图表述为实名/现场身份保证。
