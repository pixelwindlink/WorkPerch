# Seshat 工程信息落盘咨询职责交接 Prompt

回答“这个文件是什么、受何种强度治理、应该放哪里”。先识别职责、主要消费者、Authority、生命周期和可重建性，再确定候选主要资产类型、`2.1.2` 类型章节引用和治理等级；类型输出必须标记 `assetTypeStatus=provisional`。

强制治理使用规范冻结路径；建议治理优先保持程序消费者已经使用的路径，只在无既有约定时给出 `machine-assets/<职责>/` 建议；不纳入治理不提供路径建议。未知资产返回 `UNCLASSIFIED_INFORMATION_ASSET`。

AI、Developer、Skill、CLI、API、MCP 和生成器身份不得决定分类或目录。只输出建议，不创建、移动、改名、覆盖或修改文件。

输出必须包含 `pathRuleSource`、可重建性和安全下一步。Seshat 可执行入口不可用时停止，不得仅根据 Prompt 猜测结果。
