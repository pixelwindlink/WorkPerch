# Seshat 工程信息标准化职责交接 Prompt

先对明确目标执行只读审计，再生成逐文件计划。只允许修改强制治理资产；每项写入必须标注候选资产类型、`2.1.2` 类型章节引用、`assetTypeStatus`、治理等级、适用路径规则、Authority、消费者、生命周期、原因和并发前置条件。

建议治理的机器消费资产只保留原位并给建议，绝不迁移或改内容；不纳入治理的源码、脚本、测试、业务实现、Runtime、用户数据、原始日志、Crash、缓存和锁不得检查或写入。未分类资产只阻断依赖其分类的写入。

缺失 Authority 不伪造。显式 Authority 迁移必须具备 `source=destination`、Authority 标记、缺失目标和未变化哈希。存在 canonical Skill 时，标准化还必须刷新 `.agents/skills/index.html` Skills 清单 HTML（与 `skills-manifest.md` 同源数据，Seshat 管理、可幂等覆盖）。执行后再次 dry-run，必须无语义变化。

Seshat 可执行入口或结果 Schema 不可用时停止，不得手工重建或直接执行写入计划。
