# Seshat 治理就绪验证 Skill 使用说明

本 Skill 只读组合审计、标准化 dry-run 和 live Skill discovery，回答目标工程是否已经达到工程信息治理交付条件。

```bash
seshat verify --target /绝对路径/工程 --json
```

只有审计为 `compliant`、标准化预览为 `no-changes`、全部 canonical Skill 原子完整、Contract 闭环且 assurance journal/Owner 队列不阻断时，结果才是 `ready`。需要实际修复或恢复时使用 `seshat-assure-project-governance`；本 Skill 始终只读。该结果不证明自动触发、源码质量、业务行为、部署或 Runtime 在线。
