# perch-engine-boundary Specification

## Purpose
TBD - created by archiving change convert-perch-application-to-engine. Update Purpose after archive.
## Requirements
### Requirement: Perch exposes one stable Engine identity
Perch SHALL expose Engine ID `work-perch`, name `WorkPerch`, manifest 1.2, Action Catalog discovery, Provider-compatible instance creation and human/program/agent consumer declarations while referencing `openspec/architecture/generic-engine-runtime-architecture.md` as the sole architecture authority.

#### Scenario: Runtime discovers Perch
- **WHEN** a host loads the Perch Provider
- **THEN** it SHALL discover the manifest, Action Catalog, factory and consumer declaration without importing Perch business modules into Runtime Core

### Requirement: Perch owns a bounded business capability
WorkPerch SHALL own the local developer workspace catalog of paths, notes and project launch entries, including query, modification, backup, restore and restricted registered-endpoint liveness probe capabilities.

#### Scenario: Caller asks for a workspace snapshot
- **WHEN** a legal `perch.snapshot.get` request is dispatched
- **THEN** Perch SHALL return only its owned path, note and project catalog state through the public Action

### Requirement: Perch has explicit non-responsibilities
Perch MUST NOT act as Generic Engines Runtime, Message Router, Observability Plane, shell executor, file manager, credential manager, remote scanner, another Engine state reader or another Engine health authority.

#### Scenario: Project contains a startup command
- **WHEN** a caller stores or reads a project entry with a startup command string
- **THEN** Perch SHALL treat the command as inert catalog data and SHALL NOT execute it

### Requirement: Perch preserves three internal dependency layers
Perch SHALL separate Inbound Boundary, Business Core and Outbound Boundary so that Domain/Application do not depend on HTTP, DOM, CLI, file systems, browser storage or concrete endpoint clients, and only a Composition Root knows concrete Adapters.

#### Scenario: Repository implementation changes
- **WHEN** the JSON repository is replaced by another Adapter
- **THEN** Domain rules and Action semantics SHALL remain unchanged

### Requirement: Provider exposes complete lifecycle
Perch Provider SHALL support start, readiness, health, quiesce and shutdown and SHALL release owned resources during shutdown.

#### Scenario: Host quiesces Perch
- **WHEN** quiesce begins
- **THEN** Perch SHALL reject new dispatches, allow in-flight work to finish according to its local policy and release the state lock on shutdown

### Requirement: Runtime planes preserve Perch ownership
Control Plane integration SHALL use manifest/Provider lifecycle, Data Plane integration SHALL use the dispatcher/Router boundary, and Observability SHALL use Runtime-derived metadata-only lifecycle events without reading Perch private state.

#### Scenario: Runtime observes a Perch Action
- **WHEN** an Action completes
- **THEN** observation SHALL not capture full path/note payload by default and SHALL not mutate the Engine response or business aggregate

### Requirement: Perch declares no fabricated EngineClient dependency
Perch SHALL declare only its real injected Project Launcher dependency and the exact stable Launcher Actions used by Desktop launch configuration/status/start/stop; standalone Perch catalog CRUD SHALL remain usable without that injection and no additional caller or target dependency SHALL be inferred from stored project entries.

#### Scenario: Perch lists another Engine project
- **WHEN** a project entry refers to another Engine directory or endpoint
- **THEN** the entry SHALL remain Perch catalog data and SHALL NOT create a private import, direct Engine invocation or extra manifest dependency

### Requirement: Perch consumer surfaces remain projection-consistent
Perch manifest 1.2 program Actions SHALL equal the Engine-owned Action Catalog, Agent Skills SHALL equal live canonical Perch Skill inventory, human paths SHALL remain inside the project, and `engine.describe` SHALL return the schema-safe consumer projection without compatibility-only fields.

#### Scenario: Caller requests Perch description
- **WHEN** a caller invokes `engine.describe` through in-process or CLI transport
- **THEN** the response SHALL expose the same human/program/Agent consumer facts as the manifest, SHALL omit `compatibilityPaths`, and SHALL validate against the root success payload Schema
