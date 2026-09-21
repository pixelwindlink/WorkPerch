# Seshat 治理结果验证 Skill 使用说明

本 Skill 只验证已经生成的 Seshat JSON 是否符合已安装版本的结果 Schema。它不重新执行来源命令、不访问结果中声明的目标工程、不重算 Finding，也不修改输入文件。

```bash
seshat results validate --input /绝对路径/audit.json --json
```

验证通过只表示序列化结构与 Contract 相容，不表示目标工程当前合规。验证通过后，如需历史留存，交给 `seshat-persist-governance-evidence`；如需比较两个历史结果，交给 `seshat-compare-governance-baselines`。
