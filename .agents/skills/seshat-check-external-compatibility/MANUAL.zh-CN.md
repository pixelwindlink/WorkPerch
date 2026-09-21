# Seshat 外部兼容性检查 Skill 使用说明

本 Skill 在接入外部工程前，只读检查显式选定 Seshat Provider 的完整 Node range、CLI executable discovery、精确 canonical Skill inventory、结果 Schema 和目标路径可访问性。不得用运行 checkout 的文件替代 selected Provider 的缺失资产。

```bash
seshat compatibility check --target /绝对路径/工程 --provider-root /绝对路径/seshat --json
```

`compatible` 只表示该 Provider 可以进入 bootstrap/init dry-run，不表示目标工程已经符合治理规范，也不证明 Skill 已被 Agent runtime 加载或自动触发。
