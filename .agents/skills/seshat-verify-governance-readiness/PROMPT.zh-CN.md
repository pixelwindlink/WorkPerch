# Seshat 治理就绪验证职责交接 Prompt

对用户明确指定的绝对路径执行 `seshat verify --json`。只解释组合结果，不应用修复，不创建报告，不读取 Runtime 或业务实现。

`ready` 必须同时有 compliant 审计、no-changes 标准化 dry-run、完整 Skill discovery、Contract closure 和不阻断的 assurance evidence。否则按结果返回 `needs-attention` 或 `blocked`；需要整改或恢复时路由到 `$seshat-assure-project-governance`，不得由本 Skill 写入。
