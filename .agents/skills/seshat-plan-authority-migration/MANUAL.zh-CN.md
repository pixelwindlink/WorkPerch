# Seshat Authority 路径迁移规划 Skill 使用说明

本 Skill 只为调用者明确给出的 `source=destination` 关系生成迁移预览，检查源文件、目标缺失、Authority 标记和源哈希。它不会移动、改名、删除或覆盖文件。

```bash
seshat migration plan --target /绝对路径/工程 --migrate-authority AGENT.md=AGENTS.md --json
```

计划通过后仍需由 `seshat-standardize-information-assets` 重新生成并应用最终写入计划。建议治理机器契约、源码、脚本、测试、Runtime 和用户数据不能通过本 Skill 迁移。
