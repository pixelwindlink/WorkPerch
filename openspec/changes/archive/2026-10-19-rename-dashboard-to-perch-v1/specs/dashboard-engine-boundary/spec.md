## MODIFIED Requirements

### Requirement: Dashboard exposes one stable Engine identity
WorkPerch SHALL expose Engine ID `perch`, name `WorkPerch`, manifest 1.2, Action Catalog discovery, Provider-compatible instance creation and human/program/agent consumer declarations while referencing `../../../../openspec/architecture/generic-engine-runtime-architecture.md` as the sole architecture authority.

#### Scenario: Runtime discovers WorkPerch
- **WHEN** a host loads the WorkPerch Provider
- **THEN** it SHALL discover the `perch` manifest, Action Catalog, factory and consumer declaration without importing WorkPerch business modules into Runtime Core

### Requirement: Dashboard consumer surfaces remain projection-consistent
WorkPerch manifest 1.2 program Actions SHALL equal the Engine-owned Action Catalog, Agent Skills SHALL equal live canonical WorkPerch Skill inventory, human paths SHALL remain inside the project, and `engine.describe` SHALL return the schema-safe consumer projection without compatibility-only fields.

#### Scenario: Caller requests WorkPerch description
- **WHEN** a caller invokes `engine.describe` through in-process or CLI transport
- **THEN** the response SHALL expose the same human/program/Agent consumer facts as the manifest, SHALL omit `compatibilityPaths`, and SHALL validate against the root success payload Schema
