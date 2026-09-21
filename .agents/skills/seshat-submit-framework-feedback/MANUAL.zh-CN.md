# Seshat 框架问题反馈 Skill 使用说明

本 Skill 专门把业务工程责任人或责任 Agent 遇到的 Seshat 能力问题反馈给 Seshat 维护者。它与其他业务工程治理 Skill 的区别是：它不治理业务工程，也不在业务工程中生成产物。

Agent 必须一次只问一个问题，逐步了解：受影响能力、期望行为、实际行为、复现步骤、证据、为什么怀疑是 Seshat 内部逻辑、影响、环境和敏感信息检查。已知答案不得重复询问，无法确认的事实明确记录为 `unknown`。

完整汇总后，Agent 还必须让报告者做一次最终确认，再执行：

```bash
seshat feedback submit \
  --input /临时目录/seshat-feedback.json \
  --provider-root /Seshat工程绝对路径 \
  --dry-run --json

seshat feedback submit \
  --input /临时目录/seshat-feedback.json \
  --provider-root /Seshat工程绝对路径 \
  --json
```

业务工程责任人没有 Seshat 仓库访问入口时，改用维护者提供的 Seshat-owned endpoint：

```bash
seshat feedback submit \
  --input /临时目录/seshat-feedback.json \
  --endpoint https://<seshat-provider>/feedback \
  --dry-run --json
```

问题将按需求文档已经冻结的 `2.1.2.9 持久产物 → artifacts/review/<issue-id>.md` 收录到 Seshat Provider，不会写入来源业务工程。临时 JSON 只负责传输和校验，不持久保存第二份反馈正文。没有本地 Provider 路径时，必须使用 Seshat 维护者配置的远程反馈端点；两者都不存在时阻断，不伪报提交成功。Issue 只表示待审反馈，不表示 Seshat 已确认缺陷；确认后仍需进入 OpenSpec Change。
