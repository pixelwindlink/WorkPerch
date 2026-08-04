> Generic Engines architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md` at the workspace root. This change affects Dashboard Agent tooling only.

## Why

Dashboard 的 `register-project-entry` Skill 当前位于 legacy `skills/`，并用固定目录层数解析 `DASHBOARD_ROOT`。Generic Engines 已选择 `.agents/skills/` 作为 canonical 项目 Skill 目录，因此 Dashboard 需要无破坏迁移，并补充一个让 Agent 能稳定启动、测试和诊断 Dashboard 的项目操作 Skill。

## What Changes

- 将 `register-project-entry` 的权威实现迁移到 `.agents/skills/register-project-entry/`。
- 将工程根解析改为基于 `engine.manifest.json` 的身份发现，而不是依赖 Skill 所在层数。
- 保留 `skills/register-project-entry/` 兼容适配器，使旧 Prompt 和旧绝对路径继续委托 canonical Skill。
- 新增 `.agents/skills/operate-dashboard/`，说明 Server/CLI 模式、状态所有权、启动、测试、日志和故障处理。
- 更新 Dashboard AGENT、README、Prompt 和契约测试中的 canonical/legacy 路径。
- 不修改 Dashboard Action、业务状态、UI、Schema 或现有转换 Change。

## Capabilities

### New Capabilities

- `dashboard-agent-skills`: 定义 Dashboard canonical Skill layout、操作 Skill、项目入口 Skill 和 legacy path compatibility。

### Modified Capabilities

无。

## Impact

- 仅新增或修改 Agent tooling、文档、Prompt 和相关契约测试。
- 保留当前未提交的 Dashboard 业务代码和 OpenSpec 修改，不改动 `app.js`、Domain、Action Schema 或 UI 文件。
- 兼容旧 Skill 绝对路径，新的 Agent discovery 使用 `.agents/skills/`。
