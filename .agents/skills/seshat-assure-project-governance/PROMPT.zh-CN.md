# 自治治理保障职责交接 Prompt

当外部工程接入、升级或修改 Seshat 治理资产时，优先使用：

```text
使用 $seshat-assure-project-governance 审查目标工程；先以 review/dry-run 发现并列出确定性计划、整改路由和 Owner 决策队列。只有明确获得写入授权时才 apply。若返回 partial，依据 journal 核对 completed/pending/blocked 并只做 digest 守护的前向恢复；重新运行 assurance 直到第二次检查无确定性变更，再运行 verify。不要把静态 Skill 对齐或治理 ready 宣称成真实自动触发、源码、业务或 Runtime 验证。
```
