# Seshat 外部兼容性检查职责交接 Prompt

对明确目标和显式 Provider 执行 `seshat compatibility check --provider-root <provider> --json`，解释严格版本/Node range、CLI executable、完整 Skill inventory 和 Provider-owned Schema 检查结果。

不得安装、审计或修改目标，不得从运行 checkout 补齐 selected Provider 的失败项。兼容后只允许进入 bootstrap/init dry-run；不兼容时停止，不能以手工复制绕过失败项。
