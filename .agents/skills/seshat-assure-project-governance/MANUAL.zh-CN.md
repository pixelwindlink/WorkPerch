# 自治治理保障 Skill 使用说明

`seshat-assure-project-governance` 是外部工程的统一治理入口：它发现、分类、计划、执行并验证 Seshat 治理状态，确定性问题自动收敛，只把真实业务/Authority/所有权选择留给 Owner。

```bash
seshat assure --target /绝对路径/工程 --review --json
seshat assure --target /绝对路径/工程 --dry-run --json
seshat assure --target /绝对路径/工程 --apply --json
```

review 只读；dry-run 只生成计划；apply 需要明确写入授权。若部分独立操作已完成而后续 precondition 失败，必须保留 journal 并返回 `partial`，逐项说明 completed/pending/blocked，只做 digest 守护的前向恢复。apply 后必须检查第二次 assurance 是否 `no-changes`，再运行 `seshat verify`。未对齐 Skill 可以整改，但在完成对齐、来源治理和必要证据前不得声明 enabled、public、自动触发已验证或 readiness。
