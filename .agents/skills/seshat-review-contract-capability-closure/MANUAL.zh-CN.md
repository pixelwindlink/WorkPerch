# 审查 Contract 能力闭环

检查 Seshat Provider 自身每个稳定 Contract 是否都有可发现、可执行、可验证和可修复偏差的能力入口。该 Skill 的 operatingScope 固定为 `provider-self`，不审查任意外部工程 Contract。

```bash
seshat contracts review --invocation-context /绝对路径/工程 --json
```

旧的 `--target` 仍可使用，但只记录为 invocation context；输出会给出 `providerRoot`、`reviewSubject` 和 `targetContractsInspected=false`。

结果为 `compliant` 后，再运行 `seshat verify`；该审查只读，不修改目标工程。
