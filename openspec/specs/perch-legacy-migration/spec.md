# perch-legacy-migration Specification

## Purpose
TBD - created by archiving change convert-perch-application-to-engine. Update Purpose after archive.
## Requirements
### Requirement: Existing localStorage data is detected after Engine connection
Web UI SHALL inspect `local-dashboard.paths.v1` and `local-dashboard.notes.v1` only after a successful Engine snapshot and SHALL continue treating `local-dashboard.theme.v1` as a browser preference.

#### Scenario: Legacy paths and notes exist
- **WHEN** UI first connects and no successful migration marker exists
- **THEN** UI SHALL display path/note counts and request explicit user confirmation before sending data

### Requirement: Legacy migration uses backup import
Confirmed localStorage migration SHALL construct a `perch-key-value-list` version 1 backup and invoke `perch.backup.import`, first as dryRun and then as an explicitly confirmed merge commit.

#### Scenario: Dry run rejects one legacy item
- **WHEN** Engine reports invalid import
- **THEN** UI SHALL not issue the commit request and SHALL leave all localStorage data unchanged

### Requirement: Legacy data is not automatically deleted
UI MUST NOT delete legacy paths or notes before or after migration automatically; after Engine confirms persistence it SHALL record a migration marker and offer a separate explicitly confirmed manual cleanup while preserving theme.

#### Scenario: Migration succeeds
- **WHEN** Engine returns the committed revision
- **THEN** old paths and notes SHALL still exist until the user chooses manual cleanup

### Requirement: Import remains compatible with backup version 1
Perch SHALL accept the existing `format: perch-key-value-list`, `version: 1` structure and SHALL fully validate its paths and notes before dry-run or commit.

#### Scenario: Legacy backup omits projects
- **WHEN** it is imported in merge mode
- **THEN** existing Engine projects SHALL remain unchanged

#### Scenario: Legacy path contains a valid color
- **WHEN** a version 1 path item contains a six-digit hexadecimal `color`
- **THEN** Perch SHALL map it to public groupColor while preserving legacy backup compatibility

### Requirement: Merge and replace are explicit
Backup import SHALL require mode `merge` or `replace`; merge SHALL combine validated items using stable identity rules, while replace SHALL replace all catalog collections represented by the accepted backup semantics.

#### Scenario: User selects replace
- **WHEN** dry-run summary is confirmed with current expectedRevision
- **THEN** one atomic commit SHALL replace the target aggregate collections and increment revision once

### Requirement: Direct HTML mode is not a second state owner
Opening static HTML without WorkPerch Server MAY display the UI shell and legacy migration information but MUST NOT allow localStorage-backed business writes or claim migration success.

#### Scenario: User opens index.html directly
- **WHEN** `POST /engine-message` is unavailable
- **THEN** UI SHALL show connection guidance and keep legacy data untouched

### Requirement: Migration and rollback preserve user options
The migration SHALL not require deleting legacy data or modifying another Engine, and rollback SHALL allow the prior UI version to continue reading untouched legacy localStorage.

#### Scenario: New Engine is rolled back before cleanup
- **WHEN** the user returns to the previous Application
- **THEN** existing paths, notes and theme SHALL remain available in their original keys
