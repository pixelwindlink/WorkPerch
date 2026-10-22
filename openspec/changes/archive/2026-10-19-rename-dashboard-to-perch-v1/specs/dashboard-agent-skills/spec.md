## MODIFIED Requirements

### Requirement: Dashboard Skills use the canonical Agent directory
WorkPerch SHALL publish complete project-local Skills under `.agents/skills/` and SHALL expose `operate-perch` and `register-project-entry` there.

#### Scenario: A new Agent session opens WorkPerch
- **WHEN** project Skills are discovered
- **THEN** operations and project-registration capabilities SHALL be available from the canonical directory with `operate-perch` as the operation Skill

### Requirement: Dashboard root resolution validates Engine identity
WorkPerch Skills SHALL resolve the project root by locating `engine.manifest.json` and confirming Engine ID `perch`, and MUST NOT depend on a fixed parent-directory count.

#### Scenario: register-project-entry is loaded from the canonical directory
- **WHEN** it resolves WorkPerch contracts
- **THEN** it SHALL locate the same Action Schemas under the renamed `perch` Engine root
