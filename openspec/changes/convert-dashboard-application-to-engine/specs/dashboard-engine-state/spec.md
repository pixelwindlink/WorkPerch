## ADDED Requirements

### Requirement: Dashboard owns one versioned aggregate
Dashboard SHALL persist schemaVersion, aggregateRevision, paths, notes, projects, createdAt and updatedAt as one Engine-owned aggregate whose schema and domain invariants are validated on every load and commit.

#### Scenario: A new empty runtime root starts
- **WHEN** no state file exists and Dashboard owns the root
- **THEN** Dashboard SHALL atomically create schema version 1.0 state with revision zero and configured first-run project seed

### Requirement: Runtime data location is separated from source
Dashboard SHALL use `DASHBOARD_RUNTIME_DIR` as the runtime-root override, SHALL require an absolute isolated directory for Standalone CLI and tests, and SHALL never commit state, locks, backups or user data to Git.

#### Scenario: Conformance starts Dashboard
- **WHEN** conformance supplies a fresh temporary `DASHBOARD_RUNTIME_DIR`
- **THEN** all mutable files SHALL remain inside that temporary directory

### Requirement: Normal operation has one writer
Dashboard Server SHALL be the normal single writer; CLI SHALL either call that Server or acquire exclusive ownership of an explicitly isolated Standalone root, and a second writer SHALL receive `STATE_OWNERSHIP_CONFLICT`.

#### Scenario: Server already holds the runtime lock
- **WHEN** Standalone CLI opens the same root
- **THEN** CLI SHALL emit a structured conflict response and SHALL NOT read-modify-write the aggregate

### Requirement: State writes are atomic and recoverable
Repository commits SHALL validate the full aggregate, write and sync a temporary file, preserve a predictable previous-revision backup, and atomically replace the state file.

#### Scenario: Commit fails before rename
- **WHEN** temporary write or validation fails
- **THEN** the previous state file SHALL remain authoritative and readable

### Requirement: Corrupt state is never silently overwritten
Invalid JSON, unsupported schemaVersion or aggregate invariant failure SHALL produce `DASHBOARD_STATE_CORRUPT`; Dashboard SHALL not replace the state with defaults merely because it cannot load it.

#### Scenario: State file contains truncated JSON
- **WHEN** Engine startup or Action load reads it
- **THEN** readiness/Action SHALL report corruption and the original bytes SHALL remain untouched

### Requirement: Revision prevents silent concurrent overwrite
Every state-changing Action SHALL compare expectedRevision with the loaded aggregateRevision and SHALL increment revision exactly once after an actual successful commit.

#### Scenario: Two clients edit from one snapshot
- **WHEN** the first write commits and the second uses the old revision
- **THEN** the second SHALL receive `DASHBOARD_REVISION_CONFLICT` and SHALL reload before retrying

### Requirement: Seed is initialization input rather than permanent authority
Legacy project entries MAY be supplied through a first-run Seed Adapter, but after state initialization the aggregate SHALL be the sole project catalog authority and seed changes SHALL not overwrite user state.

#### Scenario: Server restarts after project edits
- **WHEN** a valid aggregate already exists
- **THEN** Dashboard SHALL restore projects from state and SHALL NOT reapply the source seed

### Requirement: Source paths are not domain constants
Domain rules MUST NOT contain user-specific `/Users/ugreen/...` paths; environment- or Composition-derived path strings MAY be stored as user/project state.

#### Scenario: Dashboard is checked out under another home directory
- **WHEN** first-run seed is constructed
- **THEN** paths SHALL derive from injected configuration rather than the original developer absolute path
