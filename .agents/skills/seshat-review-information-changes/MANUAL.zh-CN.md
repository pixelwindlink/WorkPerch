# Seshat 工程信息变更集审查 Skill 使用说明

本 Skill 只读取 Git 变更路径，按治理等级和候选资产类型标注本次变更的治理风险，不读取文件内容。

```bash
seshat review changes --target /绝对路径/工程 --base HEAD --json
```

强制治理路径进入 Authority 审查；建议治理机器资产交给程序消费者 Owner；源码和测试保持在普通代码审查范围；未分类信息资产会阻断治理结论。
