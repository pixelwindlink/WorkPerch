# Contract 闭环审查交接

本 Skill 只审查 Seshat Provider 自身 Contract。使用 `seshat contracts review --invocation-context <project> --json`（旧 `--target` 仅是兼容调用上下文），逐项检查 `discover`、`execute`、`verify`、`remediate` 路由；发现缺口时创建或更新 OpenSpec Change，不从报告臆造修复。始终确认输出 `operatingScope=provider-self` 且 `targetContractsInspected=false`。
