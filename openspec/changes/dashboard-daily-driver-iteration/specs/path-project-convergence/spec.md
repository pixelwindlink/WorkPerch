## ADDED Requirements

### Requirement: Promote path to project entry
A connected path row MUST offer a promote action that opens the project editor prefilled with that path’s absolute path, name, and tag selection. Saving MUST use `dashboard.project.upsert` and MUST NOT automatically delete the source path entry.

#### Scenario: Promote opens prefilled project editor
- **WHEN** the operator chooses promote on a path entry
- **THEN** the project editor opens with path and name taken from that path entry
- **AND** confirming save creates or updates a project through the EngineMessage project upsert Action

### Requirement: Path and project duplicate hint
When a path entry’s comparable absolute path matches an existing project entry path, the path row MUST show a hint that the path is already registered as a project entry and MUST allow revealing that project.

#### Scenario: Duplicate project chip on path row
- **WHEN** a rendered path shares a comparable absolute path with a project
- **THEN** the path row shows a project-duplicate hint
- **AND** activating the hint switches to the launcher panel and highlights that project
