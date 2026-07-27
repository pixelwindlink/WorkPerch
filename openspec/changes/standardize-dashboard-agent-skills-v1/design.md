> Generic Engines architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md` at the workspace root.

## Context

Dashboard 已有完整 `register-project-entry` Skill、独立 Prompt 和契约测试，但它们硬编码 `skills/register-project-entry`，Skill 还假设自身向上两层就是 Dashboard Root。迁移到 `.agents/skills/` 后该假设失效。Dashboard 当前业务工作树有大量未提交修改，因此迁移必须只触碰 Agent tooling、AGENT、README、Prompt 和独立测试。

## Goals / Non-Goals

**Goals:**

- canonical 化 `register-project-entry`，保持 Action、revision、状态所有权和禁止执行 command 的全部行为。
- 让 legacy 路径和旧 Prompt 继续工作。
- 新增 `operate-dashboard`，封装当前真实命令和 Server/Standalone 安全边界。

**Non-Goals:**

- 不修改 Dashboard Domain、Action、Schema、状态、UI 或 Transport。
- 不改变 Server 默认端口、runtime ownership 或 Registry 状态。

## Decisions

### 1. Canonical Skill owns the workflow

完整 `register-project-entry` 内容移动到 `.agents/skills/register-project-entry/`。旧目录的 `SKILL.md` 仅保留有效 frontmatter 与委托步骤，避免双事实来源。

### 2. Resolve Dashboard Root by manifest identity

Skill 要求从当前路径/工作目录向上寻找 `engine.manifest.json`，读取后必须确认 `id=dashboard`。找不到、找到多个或 ID 不匹配时停止。该方式不依赖目录层数，也不会误用其他 checkout。

### 3. Keep old Prompt behavior

Prompt 改为首先引用 canonical absolute path，并记录 legacy path 仍是兼容入口。契约测试同时验证 canonical 行为、legacy 委托和 Prompt 的回读要求。

### 4. Operations Skill is separate from registration Skill

`operate-dashboard` 负责项目本身的启动、check/test、临时 runtime、Server owner、CLI 和根 conformance；`register-project-entry` 只负责让其他项目写入 Dashboard 项目目录。

## Risks / Trade-offs

- [旧绝对路径失效] → 保留 legacy adapter 和 metadata。
- [错误定位其他 manifest] → 必须验证 manifest ID。
- [业务文件冲突] → 不编辑当前 dirty 业务文件。

## Migration Plan

1. 初始化两个 canonical Skills。
2. 将 register workflow 迁移并建立 legacy adapter。
3. 更新 AGENT、README、Prompt 和专用契约测试。
4. 运行 quick validation、Dashboard check/test/OpenSpec 和根 Dashboard conformance。

回滚恢复旧完整 Skill 内容并移除 canonical 目录，不涉及业务状态。
