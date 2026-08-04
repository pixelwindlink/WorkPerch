## MODIFIED Requirements

### Requirement: Dashboard exposes one stable Engine identity
Dashboard SHALL expose Engine ID `dashboard`, name `Dashboard Engine`, manifest 1.2, Action Catalog discovery, Provider-compatible instance creation and human/program/agent consumer declarations while referencing `openspec/changes/define-generic-engine-runtime-architecture/design.md` as the sole architecture authority.

#### Scenario: Runtime discovers Dashboard
- **WHEN** a host loads the Dashboard Provider
- **THEN** it SHALL discover the manifest, Action Catalog, factory and consumer declaration without importing Dashboard business modules into Runtime Core

### Requirement: Dashboard declares no fabricated EngineClient dependency
Dashboard SHALL declare only its real injected Project Launcher dependency and the exact stable Launcher Actions used by Desktop launch configuration/status/start/stop; standalone Dashboard catalog CRUD SHALL remain usable without that injection and no additional caller or target dependency SHALL be inferred from stored project entries.

#### Scenario: Dashboard lists another Engine project
- **WHEN** a project entry refers to another Engine directory or endpoint
- **THEN** the entry SHALL remain Dashboard catalog data and SHALL NOT create a private import, direct Engine invocation or extra manifest dependency

## ADDED Requirements

### Requirement: Dashboard consumer surfaces remain projection-consistent
Dashboard manifest 1.2 program Actions SHALL equal the Engine-owned Action Catalog, Agent Skills SHALL equal live canonical Dashboard Skill inventory, human paths SHALL remain inside the project, and `engine.describe` SHALL return the schema-safe consumer projection without compatibility-only fields.

#### Scenario: Caller requests Dashboard description
- **WHEN** a caller invokes `engine.describe` through in-process or CLI transport
- **THEN** the response SHALL expose the same human/program/Agent consumer facts as the manifest, SHALL omit `compatibilityPaths`, and SHALL validate against the root success payload Schema

> Architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md`.
