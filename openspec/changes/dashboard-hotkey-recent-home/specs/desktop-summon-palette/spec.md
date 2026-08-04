## ADDED Requirements

### Requirement: Global desktop summon hotkey
Dashboard Desktop MUST register a process-wide keyboard shortcut that shows, restores if minimized, and focuses the main Dashboard window, then notifies the renderer to open the summon palette. Registration failure MUST NOT prevent app startup.

#### Scenario: Hotkey focuses window and opens palette
- **WHEN** the operator presses the registered summon hotkey while Dashboard Desktop is running
- **THEN** the main window is shown and focused
- **AND** the renderer receives a summon notification and opens the summon palette

### Requirement: Summon palette searches registered entries
The summon palette MUST search Engine-owned paths and projects by name/path/tags. With an empty query it MUST list recent paths and recent projects first. Choosing a path MUST open it through the existing Desktop Finder bridge when available. Escape MUST close the palette.

#### Scenario: Empty query shows recent entries
- **WHEN** the summon palette opens with an empty query and usage data exists
- **THEN** recent path and project entries appear before other matches

#### Scenario: Escape closes palette
- **WHEN** the summon palette is open and the operator presses Escape
- **THEN** the palette closes without navigating away from the current tab
