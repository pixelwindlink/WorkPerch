## Context

Dashboard 已登记为 `engine/conformant`，其 Provider、Data connector、Action Catalog、CLI/HTTP/in-process parity、single-writer 状态和注入 Project Launcher 的 EngineClient 边界均已存在。2026-08-04 fresh alignment preflight 判定 `drifted`：根治理当前主动迁移要求 manifest 1.2，而 Dashboard 仍是 1.1，使 Baseline 与 Runtime inspection 在公开合同验证前失败。

Dashboard 当前真实消费面包括 README/architecture 文档、28 个 EngineMessage Actions，以及 canonical Skills `operate-dashboard`、`register-project-entry`。本 Change 是上位 `formalize-engine-consumer-surfaces-v1` 的项目级迁移，只允许修改 Integration Shell 的声明与投影，不迁移 Dashboard aggregate 或改变业务行为。

## Goals / Non-Goals

**Goals:**

- 迁移到 manifest 1.2，并让 program Actions、Agent Skills 和 human paths 与项目真源保持一致。
- 让 `engine.describe` 返回符合根 success payload Schema 的 consumer projection。
- 通过新版本身份避免相同 Engine/version 的 consumer digest 冲突。
- 用 target tests、Baseline、Runtime inspection、alignment 和根 conformance 形成新证据。

**Non-Goals:**

- 不改变 Dashboard Action payload、state Schema、EngineClient dependency、Provider lifecycle 或 UI/业务逻辑。
- 不读取、迁移或删除正常 `DASHBOARD_RUNTIME_DIR` / `runtime_data`。
- 不新增 Improvement handler，不改变 Registry status，不声明持久在线 Instance。

## Decisions

### 1. Consumer declaration 只索引已有权威

`consumers.program.actions` 从当前 Action Catalog 的精确名称集合建立；Action Schema、errors、deprecated 仍只由 Catalog 拥有。`consumers.agent.skills` 只声明 live canonical Skills，旧 `skills/register-project-entry/SKILL.md` 仅作为 compatibilityPath。human paths 只引用项目内 README 和 architecture 文档。

替代方案是只声明最小标准 Actions。拒绝，因为 program surface 必须与完整公开 Catalog 一致，否则 Runtime/Agent 发现会有损。

### 2. Describe 使用 schema-safe 投影

manifest 可以保留 Skill `compatibilityPaths`，但当前 `engine.describe` success Schema 不接受该字段。因此 Dispatcher 从 manifest 构造 consumer projection，保留 human/program 以及 Agent name/path/description，显式剔除 compatibilityPath；不从文件系统或 live discovery 动态拼装。

替代方案是直接返回 `manifest.consumers`。拒绝，因为会使合法 manifest 产生非法 describe success payload。

### 3. Contract 版本升级到 2.2.0

consumer declaration 参与 Runtime Definition digest。manifest/package identity 升到 `2.2.0`，让真实 Host 可以把新消费者合同登记为新 Definition，而不是把同版本不同 digest 判定为冲突。Dashboard business-state Schema/version 不变。

### 4. 只补回归，不改 Business Core

测试验证 manifest Schema、program/Catalog parity、Agent live inventory、human path confinement、describe projection和 CLI/in-process parity。现有 Dashboard aggregate、Repository、UI、Desktop 和 Launcher integration 代码保持不动。

## Risks / Trade-offs

- [Dashboard 工作树已有大量用户修改] → 只 patch manifest、package identity、Dispatcher、边界测试、README 和本 Change；不格式化或覆盖其他文件。
- [package-lock 顶层版本已落后 package.json] → 仅同步 lockfile 自身的 root package version 字段，不执行网络安装或重写依赖树。
- [describe 投影与 manifest 漂移] → 测试直接以加载的 manifest/Catalog/live Skill inventory为输入比较，不维护第二份预期清单。
- [历史 Host 已登记 2.1.0] → 2.2.0 使用新 digest；本次 inspection 只证明 registerable，不伪造持久 Definition/Instance。

## Migration Plan

1. 更新 manifest/package identity 与 consumer declarations。
2. 更新 Dispatcher describe projection和回归测试/文档。
3. 运行 `npm run check`、target tests、OpenSpec、Baseline、Runtime inspection 和 fresh alignment。
4. 根 selected/full conformance 通过后仅刷新 dated evidence，不改变 Registry status。

Rollback 恢复 1.1 manifest、2.1.0 identity 与旧 describe payload即可；Dashboard 业务状态没有迁移，无需数据回滚。当前根治理下回滚会重新使 Baseline/inspection 失败。

## Open Questions

无。Dashboard 当前不声明 Improvement consumer；未来 opt-in 必须使用独立项目 Change。

> Architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md`.
