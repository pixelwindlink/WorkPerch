## ADDED Requirements

### Requirement: Primary recent entry rail
The paths panel MUST present a primary home rail above the full path list with up to eight recently used paths, up to eight frequently used paths, and up to eight recently used projects. Activating a path chip MUST reveal that path; activating a project chip MUST reveal that project in the launcher panel.

#### Scenario: Recent project chip reveals launcher entry
- **WHEN** a project has `usage.lastUsedAt` and the home rail is visible
- **THEN** the recent-projects section may list that project
- **AND** activating its chip switches to the launcher panel and highlights that project
