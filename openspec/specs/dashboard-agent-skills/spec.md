# Dashboard Agent Skills Specification

## Purpose

定义 Dashboard canonical 项目 Skills、manifest 身份发现、旧注册 Skill 兼容和操作状态所有权说明。

## Architecture Authority

Generic Engines 唯一架构设计权威是 workspace 根的 `openspec/changes/define-generic-engine-runtime-architecture/design.md`。

## Requirements

### Requirement: Dashboard Skills use the canonical Agent directory
Dashboard SHALL publish complete project-local Skills under `.agents/skills/` and SHALL expose both `operate-dashboard` and `register-project-entry` there.

#### Scenario: A new Agent session opens Dashboard
- **WHEN** project Skills are discovered
- **THEN** both operations and project-registration capabilities SHALL be available from the canonical directory

### Requirement: Dashboard root resolution validates Engine identity
Dashboard Skills SHALL resolve the project root by locating `engine.manifest.json` and confirming Engine ID `dashboard`, and MUST NOT depend on a fixed parent-directory count.

#### Scenario: register-project-entry is loaded from the canonical directory
- **WHEN** it resolves Dashboard contracts
- **THEN** it SHALL locate the same Action Schemas used before migration

### Requirement: Legacy project registration path delegates without behavior loss
`skills/register-project-entry/SKILL.md` SHALL remain readable and SHALL delegate to the canonical Skill while preserving the old public prompt and invocation name.

#### Scenario: An Agent follows the old absolute Skill path
- **WHEN** it loads the compatibility adapter
- **THEN** it SHALL continue with the canonical snapshot, upsert, revision-conflict and read-back workflow

### Requirement: Dashboard operations Skill preserves state ownership
`operate-dashboard` SHALL document Server Client and Standalone Exclusive modes, temporary test runtime, check/test/OpenSpec/root conformance commands, stdout/stderr rules and the prohibition on competing state writers.

#### Scenario: Dashboard Server owns a runtime root
- **WHEN** an Agent wants to run a CLI write
- **THEN** the Skill SHALL require Server Client mode or a different explicitly isolated runtime root
