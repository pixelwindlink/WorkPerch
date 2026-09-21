# Seshat 治理基线比较 Skill 使用说明

本 Skill 只读比较同一目标、同一 Seshat 命令生成的两份 JSON 结果，展示状态、Finding code 和治理等级计数是否变化。

```bash
seshat compare baselines --before /绝对路径/before.json --after /绝对路径/after.json --json
```

不同目标或不同命令会被阻断。比较结果不是一次新审计，也不能单独证明治理变好或变坏；当前合规结论仍需重新运行原命令。
