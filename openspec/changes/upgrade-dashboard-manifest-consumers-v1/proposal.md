## Why

Generic Engines 当前主动迁移准入要求 manifest 1.2，而 Dashboard 仍声明 1.1，导致 Baseline、Runtime Definition inspection 和根黑盒 conformance 在执行 Dashboard 前失败。Dashboard 已有稳定的人类文档、完整 Action Catalog 和两个 canonical Agent Skills，应把这些真实消费面纳入 manifest 与 `engine.describe`，而不是继续依赖隐式发现。

## What Changes

- 将 Dashboard manifest 从 1.1 升到 1.2，并把 Engine/package Contract 版本从 `2.1.0` 升到 `2.2.0`，使 consumer declaration 形成新的不可变 Definition 身份。
- 声明 human、program 和 agent consumers；program Action 集合与当前 Action Catalog 完全一致，Agent Skill 与 live canonical inventory 完全一致。
- 让 `engine.describe` 投影 schema-safe consumers，并增加 manifest/Action/Skill/文档路径与 CLI/in-process parity 回归测试。
- 保持 Dashboard Actions、状态 Schema、single-writer 所有权、EngineClient dependency、Provider、Transport 和 Business Core 不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `dashboard-engine-boundary`: Dashboard 的公共 Engine 身份升级为 manifest 1.2，并明确可校验的人类、程序和 Agent 消费面及 describe 投影。

## Impact

- 修改 `engine.manifest.json`、package version、`engine.describe` 应用投影、边界测试和 README/OpenSpec 说明。
- 不迁移 Dashboard runtime state，不启动正常 Server，不读取用户数据，不改变 Registry status，也不声明 Runtime Instance online。
- 上位治理 Change：`formalize-engine-consumer-surfaces-v1`；唯一架构权威：`openspec/changes/define-generic-engine-runtime-architecture/design.md`。
