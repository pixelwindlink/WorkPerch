# Seshat 治理证据留存 Skill 使用说明

本 Skill 把已经生成的 Seshat 只读 JSON 结果，或 `init`/`standardize` dry-run 计划，以“先预览、禁止覆盖、内容不改写”的方式留存在目标工程 `artifacts/` 对应类别中。

```bash
seshat evidence persist --target /绝对路径/工程 --input /绝对路径/audit.json --class audit --id review-2026-08-20 --dry-run --json
seshat evidence persist --target /绝对路径/工程 --input /绝对路径/audit.json --class audit --id review-2026-08-20 --json
```

它不重新执行审计，不把任意 JSON 当作证据，也不覆盖已有持久产物。相同内容和相同目标再次执行必须返回 `no-changes`。首次出现 `artifacts/` 后，再运行 standardize dry-run；只有受管外部工程地图变旧时才刷新导航。
