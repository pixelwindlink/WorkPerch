# perch-engine-actions Specification

## Purpose
TBD - created by archiving change convert-perch-application-to-engine. Update Purpose after archive.
## Requirements
### Requirement: All public capabilities are declared Actions
Perch SHALL declare `engine.describe`, `system.health`, `perch.snapshot.get`, path/note/project upsert and delete, `perch.project.probe`, `perch.backup.export` and `perch.backup.import` in one Action Catalog with request and success payload Schema references.

#### Scenario: Caller discovers Actions
- **WHEN** `engine.describe` succeeds
- **THEN** its Action list SHALL match the manifest and Action Catalog names, Schema references, errors and deprecation flags

### Requirement: Boundaries validate request and success payloads from formal Schema
Every Action request and success payload SHALL be validated against its JSON Schema 2020-12 file, each Perch payload Schema SHALL reject additional properties, and unsupported payloads SHALL not reach a use case.

#### Scenario: Request contains an unknown payload field
- **WHEN** payload validation detects the undeclared field
- **THEN** Dispatcher SHALL return a legal EngineMessage error with code `INVALID_PAYLOAD` and SHALL NOT mutate state

### Requirement: Snapshot returns a revisioned public aggregate view
`perch.snapshot.get` SHALL return schemaVersion, aggregateRevision, timestamps and the explicitly included public paths, notes and projects without exposing internal files or lock metadata.

#### Scenario: Caller requests only paths
- **WHEN** include is `paths`
- **THEN** the success payload SHALL contain revision metadata and paths but SHALL omit notes and projects

### Requirement: Path Actions enforce path invariants and revision
`perch.path.upsert` SHALL create or update a path with name, absolute path, group, optional six-digit hexadecimal groupColor, description and pinned state; `perch.path.delete` SHALL delete by ID; both SHALL require expectedRevision for writes.

#### Scenario: New normalized path already exists
- **WHEN** an upsert without that existing ID uses an equivalent normalized absolute path
- **THEN** Perch SHALL return `PERCH_PATH_ALREADY_EXISTS` without changing revision

#### Scenario: Path write uses stale revision
- **WHEN** expectedRevision differs from the current aggregateRevision
- **THEN** Perch SHALL return `PERCH_REVISION_CONFLICT` without writing state

#### Scenario: Caller selects a custom group color
- **WHEN** path upsert contains a valid `#RRGGBB` groupColor
- **THEN** Perch SHALL persist and return it without changing path identity or duplicate semantics

#### Scenario: Caller submits an invalid group color
- **WHEN** groupColor is not a six-digit hexadecimal color
- **THEN** Perch SHALL reject the payload and SHALL not change revision

### Requirement: Group Actions manage shared Registry items
Perch SHALL expose `perch.group.upsert` and `perch.group.delete`; each Group SHALL have a stable ID, unique normalized name and shared hexadecimal color, and every Path SHALL reference one Group Item through groupId.

#### Scenario: Two paths share one Group
- **WHEN** both paths resolve to the same groupId
- **THEN** snapshot SHALL expose one Group Item and both paths SHALL reference it

#### Scenario: Group color changes
- **WHEN** perch.group.upsert changes the shared color at the current revision
- **THEN** every Path referencing that groupId SHALL render the new color after snapshot refresh without per-path writes

#### Scenario: Referenced Group is deleted
- **WHEN** perch.group.delete targets a Group used by one or more Paths
- **THEN** Perch SHALL return `PERCH_GROUP_IN_USE` without changing revision

### Requirement: Note Actions enforce note invariants and revision
`perch.note.upsert` SHALL create or update title, content and pinned state; `perch.note.delete` SHALL delete by ID; both SHALL use expectedRevision and stable generated IDs for creates.

#### Scenario: Note ID does not exist
- **WHEN** delete targets an unknown ID at the current revision
- **THEN** Perch SHALL return `PERCH_ITEM_NOT_FOUND` without changing revision

### Requirement: Project Actions store launch metadata but never execute it
`perch.project.upsert` and `perch.project.delete` SHALL manage project name, classification label, description, path, optional loopback URL/port, command string and tags using expectedRevision, while treating commands as inert data.

#### Scenario: Project upsert includes a shell command string
- **WHEN** the Action succeeds
- **THEN** Perch SHALL persist and return the string without spawning a process or interpreting shell syntax

### Requirement: Project probe is restricted to registered loopback endpoints
`perch.project.probe` SHALL accept only registered project IDs, SHALL probe only their stored HTTP(S) loopback endpoints, SHALL enforce timeout and concurrency limits, and SHALL describe endpoint liveness rather than target Engine health.

#### Scenario: Registered project points to a remote host
- **WHEN** probe policy evaluates the endpoint
- **THEN** Perch SHALL return `PERCH_PROBE_FORBIDDEN` and SHALL NOT issue a network request

#### Scenario: Project has no endpoint
- **WHEN** it is selected for probe
- **THEN** the result SHALL identify the target as invalid/unavailable without inventing a health result

### Requirement: Backup export is stable and versioned
`perch.backup.export` SHALL return a complete `perch-engine-backup` version 1 payload containing paths, notes and projects from one aggregate revision.

#### Scenario: Backup is exported
- **WHEN** the Action succeeds
- **THEN** the returned backup SHALL be independently validatable and SHALL not expose internal state paths, locks or backup filenames

### Requirement: Backup import is fully validated and atomic
`perch.backup.import` SHALL accept explicit `merge` or `replace`, explicit dryRun, optional expectedRevision for commit, legacy backup version 1 and Engine backup version 1, and SHALL validate the complete candidate before one atomic state change.

#### Scenario: One imported item is invalid
- **WHEN** any item fails validation
- **THEN** Perch SHALL return `PERCH_IMPORT_INVALID` or `PERCH_IMPORT_REJECTED` and SHALL persist none of the import

#### Scenario: Dry run succeeds
- **WHEN** dryRun is true
- **THEN** Perch SHALL return planned add/update/skip counts without changing aggregateRevision

### Requirement: Errors remain legal EngineMessage responses
Wrong Engine, unsupported Action, invalid payload, missing item, revision conflict, invalid import, corrupt state, forbidden probe, ownership conflict and internal failures SHALL be mapped to mutually exclusive legal error responses whose id, engine and action match the request whenever a request can be identified.

#### Scenario: Request contains forbidden v1.0 metadata
- **WHEN** envelope validation runs
- **THEN** Perch SHALL reject it as a protocol error and SHALL NOT dispatch the Action
