# perch-interaction-ux Specification

## Purpose
TBD - created by archiving change improve-perch-interaction-ux. Update Purpose after archive.
## Requirements
### Requirement: Destructive and commit actions use an in-app confirm dialog
Perch Web UI MUST present an in-app modal confirmation dialog for destructive or irreversible commit actions instead of relying on the browser-native `confirm()` API. The confirmation dialog MUST remain usable while another `<dialog>` is already open.

#### Scenario: Confirm delete while TAG Registry is open
- **WHEN** the user deletes an unused TAG from the open TAG Registry dialog
- **THEN** the UI shows the in-app confirm dialog without depending on native `confirm()`
- **AND** cancel leaves the TAG unchanged and returns focus to the Registry
- **AND** confirm sends `perch.tag.delete` with `expectedRevision`

#### Scenario: Import dry-run commit uses in-app confirm
- **WHEN** a backup import dry-run succeeds and the user is asked to commit
- **THEN** the UI shows the in-app confirm dialog with the dry-run summary
- **AND** cancel aborts the commit without calling the non-dry-run import

#### Scenario: Native confirm is not used for business actions
- **WHEN** the modular UI sources under `ui/` are inspected for business confirmation flows
- **THEN** those flows MUST NOT call the browser-native `confirm(` function

### Requirement: TAG Registry exposes unused and in-use discovery
TAG Registry MUST let the user filter tags by usage and MUST show a concise reference summary per tag. Tags that are still referenced MUST remain non-deletable under existing Engine rules.

#### Scenario: Filter to unused tags
- **WHEN** the user selects the unused filter in TAG Registry
- **THEN** only tags with zero references from paths, notes, and projects are listed

#### Scenario: In-use tag shows reference summary and blocks delete
- **WHEN** a tag is referenced by one or more records
- **THEN** the registry row shows a non-zero reference summary
- **AND** activating delete does not send `perch.tag.delete`
- **AND** the UI explains that the tag is still in use

### Requirement: Narrow viewports keep primary actions reachable
On viewports down to the Desktop minimum width, the Web UI MUST keep primary header tools and the active tab search control reachable without requiring the user to recover hidden business actions.

#### Scenario: Compact width keeps header tools available
- **WHEN** the viewport width is at or below 600px
- **THEN** header tools such as sort, saved view, export, and import remain available (wrapping into additional rows as needed)
- **AND** the UI MUST NOT hide those tools solely because the viewport is narrow

#### Scenario: Active tab search remains available
- **WHEN** the user is on paths, launcher, or notes at a narrow viewport
- **THEN** the active tab search input remains visible and usable
