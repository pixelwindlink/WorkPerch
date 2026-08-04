# dashboard-engine-boundary Specification

## Purpose
TBD - created by archiving change convert-dashboard-application-to-engine. Update Purpose after archive.
## Requirements
### Requirement: Dashboard exposes one stable Engine identity
Dashboard SHALL expose Engine ID `dashboard`, name `Dashboard Engine`, manifest 1.2, Action Catalog discovery, Provider-compatible instance creation and human/program/agent consumer declarations while referencing `openspec/changes/define-generic-engine-runtime-architecture/design.md` as the sole architecture authority.

#### Scenario: Runtime discovers Dashboard
- **WHEN** a host loads the Dashboard Provider
- **THEN** it SHALL discover the manifest, Action Catalog, factory and consumer declaration without importing Dashboard business modules into Runtime Core

### Requirement: Dashboard owns a bounded business capability
Dashboard Engine SHALL own the local developer workspace catalog of paths, notes and project launch entries, including query, modification, backup, restore and restricted registered-endpoint liveness probe capabilities.

#### Scenario: Caller asks for a workspace snapshot
- **WHEN** a legal `dashboard.snapshot.get` request is dispatched
- **THEN** Dashboard SHALL return only its owned path, note and project catalog state through the public Action

### Requirement: Dashboard has explicit non-responsibilities
Dashboard MUST NOT act as Generic Engines Runtime, Message Router, Observability Plane, shell executor, file manager, credential manager, remote scanner, another Engine state reader or another Engine health authority.

#### Scenario: Project contains a startup command
- **WHEN** a caller stores or reads a project entry with a startup command string
- **THEN** Dashboard SHALL treat the command as inert catalog data and SHALL NOT execute it

### Requirement: Dashboard preserves three internal dependency layers
Dashboard SHALL separate Inbound Boundary, Business Core and Outbound Boundary so that Domain/Application do not depend on HTTP, DOM, CLI, file systems, browser storage or concrete endpoint clients, and only a Composition Root knows concrete Adapters.

#### Scenario: Repository implementation changes
- **WHEN** the JSON repository is replaced by another Adapter
- **THEN** Domain rules and Action semantics SHALL remain unchanged

### Requirement: Provider exposes complete lifecycle
Dashboard Provider SHALL support start, readiness, health, quiesce and shutdown and SHALL release owned resources during shutdown.

#### Scenario: Host quiesces Dashboard
- **WHEN** quiesce begins
- **THEN** Dashboard SHALL reject new dispatches, allow in-flight work to finish according to its local policy and release the state lock on shutdown

### Requirement: Runtime planes preserve Dashboard ownership
Control Plane integration SHALL use manifest/Provider lifecycle, Data Plane integration SHALL use the dispatcher/Router boundary, and Observability SHALL use Runtime-derived metadata-only lifecycle events without reading Dashboard private state.

#### Scenario: Runtime observes a Dashboard Action
- **WHEN** an Action completes
- **THEN** observation SHALL not capture full path/note payload by default and SHALL not mutate the Engine response or business aggregate

### Requirement: Dashboard declares no fabricated EngineClient dependency
Dashboard SHALL declare only its real injected Project Launcher dependency and the exact stable Launcher Actions used by Desktop launch configuration/status/start/stop; standalone Dashboard catalog CRUD SHALL remain usable without that injection and no additional caller or target dependency SHALL be inferred from stored project entries.

#### Scenario: Dashboard lists another Engine project
- **WHEN** a project entry refers to another Engine directory or endpoint
- **THEN** the entry SHALL remain Dashboard catalog data and SHALL NOT create a private import, direct Engine invocation or extra manifest dependency

### Requirement: Dashboard consumer surfaces remain projection-consistent
Dashboard manifest 1.2 program Actions SHALL equal the Engine-owned Action Catalog, Agent Skills SHALL equal live canonical Dashboard Skill inventory, human paths SHALL remain inside the project, and `engine.describe` SHALL return the schema-safe consumer projection without compatibility-only fields.

#### Scenario: Caller requests Dashboard description
- **WHEN** a caller invokes `engine.describe` through in-process or CLI transport
- **THEN** the response SHALL expose the same human/program/Agent consumer facts as the manifest, SHALL omit `compatibilityPaths`, and SHALL validate against the root success payload Schema
