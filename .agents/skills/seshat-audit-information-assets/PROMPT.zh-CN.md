# Seshat 工程信息审计职责交接 Prompt

对用户明确指定的绝对路径执行只读审计。先读取安装侧 Seshat 需求基线，再读取目标 README、AGENTS、OpenSpec、project-governance 和 canonical Skills。

每个结论必须同时标注治理等级、候选主要资产类型、类型章节引用和 `assetTypeStatus`。强制治理检查路径和适用内容；建议治理只报告消费者、Authority、既有路径和建议，不提出自动迁移；不纳入治理的内容不得读取或评价。未知资产返回 `UNCLASSIFIED_INFORMATION_ASSET`，并将类型状态标为 `unclassified`。

不得写入目标，不得创建报告文件，不得扫描凭据、用户数据、Runtime、原始日志、Crash、缓存和锁。区分设计声明、Contract、代码事实和 Runtime 事实，并把结论绑定到证据路径。

Seshat 可执行入口不可用时返回阻塞信息，不得依据 Prompt 自行重建分类器。
