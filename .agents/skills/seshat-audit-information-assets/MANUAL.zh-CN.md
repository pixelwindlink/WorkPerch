# Seshat 工程信息审计 Skill 使用说明

本 Skill 对目标工程执行只读审计，并分别回答两个问题：文件暂时映射到哪个候选主要资产类型，以及它处于**强制治理、建议治理、不纳入治理**中的哪一级。需求文档共有 21 个分类章节，其中 20 个是主要语义资产类型，`2.1.2.18 Sample` 只是跨类型角色，尚未冻结为公共机器枚举；因此输出必须包含类型章节引用、角色和 `assetTypeStatus=provisional`。

```bash
seshat audit --target /绝对路径/工程 --json
```

审计会检查强制治理资产的路径、适用内容规格、Authority、生命周期和冲突；对机器直接消费的资产只识别、导航和提出建议；对源码、Runtime、用户数据、原始日志、Crash、缓存和锁停止治理。未知的持续性信息文件返回 `UNCLASSIFIED_INFORMATION_ASSET`。

审计不会修改目标，也不会把 README、生成视图或设计声明当作可执行行为与 Runtime 状态证据。

外部使用时必须通过已安装的 Seshat CLI 或可信绝对入口执行；每条分类证据还应包含 `pathRuleSource` 和安全下一步。
