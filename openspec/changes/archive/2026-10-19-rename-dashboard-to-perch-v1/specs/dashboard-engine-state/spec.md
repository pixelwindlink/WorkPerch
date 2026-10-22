## MODIFIED Requirements

### Requirement: Runtime data location is separated from source
WorkPerch SHALL use `PERCH_RUNTIME_DIR` as the runtime-root override, SHALL require an absolute isolated directory for Standalone CLI and tests, and SHALL never commit state, locks, backups or user data to Git. Its default runtime root SHALL be `~/.local/share/perch-engine`, with state `perch-state.json` and ownership lock `.perch-owner.lock`.

#### Scenario: Conformance starts WorkPerch
- **WHEN** conformance supplies a fresh temporary `PERCH_RUNTIME_DIR`
- **THEN** all mutable files SHALL remain inside that temporary directory and SHALL use the `perch` state/lock names

### Requirement: State rename migrates an existing aggregate once
When `perch-state.json` is absent and a valid `dashboard-state.json` exists in the same runtime root, the Repository SHALL validate the legacy aggregate and migrate it through the existing atomic write path to `perch-state.json`, retain the legacy file, and avoid reapplying first-run seed data.

#### Scenario: Existing Dashboard state is migrated
- **WHEN** WorkPerch initializes a runtime root containing only `dashboard-state.json`
- **THEN** it SHALL create an equivalent `perch-state.json`, preserve revision and records, retain `dashboard-state.json`, and make subsequent initializations idempotent

#### Scenario: Legacy state is corrupt
- **WHEN** the only available legacy state is invalid JSON or violates aggregate invariants
- **THEN** WorkPerch SHALL fail closed with `PERCH_STATE_CORRUPT` and SHALL not create a replacement state
