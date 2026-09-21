# Seshat 审计 Finding 解释 Skill 使用说明

本 Skill 根据 Finding Catalog 解释一个审计代码的治理含义、阻断范围、责任 Owner 和安全下一步，不重新扫描工程。

```bash
seshat findings explain --code MACHINE_AUTHORITY_CONFLICT --json
```

未知代码返回 `unknown`，不能根据名称猜测或自动修复。实际工程结论仍以原始 audit Finding 的证据为准。
