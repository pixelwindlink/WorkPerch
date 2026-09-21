# Seshat 治理证据留存职责交接 Prompt

使用 `seshat evidence persist` 先 dry-run，再检查来源命令、目标工程、artifact 类别、输出路径、SHA-256 和禁止覆盖前置条件。只有来源为 Seshat 只读结果或写命令 dry-run，且声明未修改目标时才允许留存。

不得重新审计、改写结果、复制任意文件或覆盖已有证据。应用后重复执行并要求 `no-changes`；若外部工程受管地图因首次出现 `artifacts/` 而过期，只通过 standardize 刷新导航，再把证据路径交给相关 review、HANDOFF 或 OpenSpec verification 引用。
