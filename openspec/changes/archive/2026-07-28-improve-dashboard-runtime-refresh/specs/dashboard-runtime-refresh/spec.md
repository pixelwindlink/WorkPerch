## ADDED Requirements

### Requirement: Write success prefers payload-driven local refresh
After a successful mutating Dashboard Action, the Web UI MUST update client state from the Action success payload when that payload is sufficient, and MUST NOT unconditionally re-fetch the full workspace snapshot for every write. The UI MUST fall back to `dashboard.snapshot.get` when the payload cannot safely reconstruct Tag Registry or multi-collection changes.

#### Scenario: Single-item upsert with known tags patches locally
- **WHEN** a path, note, or project upsert succeeds and every `tagIds` entry already exists in the client Tag Registry
- **THEN** the UI updates `aggregateRevision` and the corresponding collection item from the success payload
- **AND** does not call `dashboard.snapshot.get` for that refresh

#### Scenario: Upsert that may introduce unknown tags refreshes via snapshot
- **WHEN** a write success payload references a tag id absent from the client Tag Registry
- **OR** the write is a batch upsert, backup import, or legacy migration commit
- **THEN** the UI refreshes through `dashboard.snapshot.get`

#### Scenario: Delete and inspect patch without full snapshot
- **WHEN** a delete Action returns `deletedId`
- **THEN** the UI removes that item from the local collection using the returned revision
- **WHEN** a path/project inspect Action returns `inspection`
- **THEN** the UI patches only that record's inspection field without a full snapshot refresh

### Requirement: Launcher dependency errors explain recovery without blocking CRUD
When Project Launcher is unavailable (`DEPENDENCY_UNAVAILABLE`), the Web UI MUST explain how to recover launch capability and MUST keep path/note/project catalog management usable.

#### Scenario: Unavailable launcher shows recovery guidance
- **WHEN** launcher status or a launch Action fails with `DEPENDENCY_UNAVAILABLE`
- **THEN** the UI presents guidance that launch/stop requires the Dashboard desktop app with Launcher resources
- **AND** communicates that catalog CRUD and directory management remain available
- **AND** the projects panel shows a persistent notice while launcher remains unavailable
