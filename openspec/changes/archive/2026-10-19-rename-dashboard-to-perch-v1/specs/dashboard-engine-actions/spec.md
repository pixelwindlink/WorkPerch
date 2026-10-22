## MODIFIED Requirements

### Requirement: All public capabilities are declared Actions
WorkPerch SHALL declare `engine.describe`, `system.health`, `perch.snapshot.get`, path/note/project upsert and delete, `perch.project.probe`, `perch.backup.export` and `perch.backup.import` in one Action Catalog with request and success payload Schema references; the complete catalog SHALL use the `perch.` namespace for Engine-owned Actions.

#### Scenario: Caller discovers Actions
- **WHEN** `engine.describe` succeeds
- **THEN** its Action list SHALL match the manifest and Action Catalog names, Schema references, errors and deprecation flags using `perch.*` for Engine-owned Actions

### Requirement: Errors remain legal EngineMessage responses
Wrong Engine, unsupported Action, invalid payload, missing item, revision conflict, invalid import, corrupt state, forbidden probe, ownership conflict and internal failures SHALL be mapped to mutually exclusive legal error responses whose id, engine and action match the request whenever a request can be identified, using current `PERCH_*` domain error codes.

#### Scenario: Request contains a stale WorkPerch revision
- **WHEN** a write Action detects a stale expected revision
- **THEN** WorkPerch SHALL return `PERCH_REVISION_CONFLICT` without writing state
