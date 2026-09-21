## ADDED Requirements

### Requirement: WorkPerch has one current Engine identity and compliant physical root
The server-capable Engine SHALL present display name `WorkPerch`, Engine ID `perch`, package identity `perch`, and physical project root `engine_projects/engine-perch`; its manifest, Provider, program consumer and Agent consumer declarations SHALL use the same current identity.

#### Scenario: Runtime loads WorkPerch
- **WHEN** a Host loads the Provider from `engine_projects/engine-perch`
- **THEN** the manifest ID SHALL be `perch`, the Provider SHALL create the `perch` Engine, and no current consumer declaration SHALL identify it as `dashboard`

### Requirement: Current rename scans do not rewrite historical evidence
The rename SHALL update current Engine-owned and root-governance references while preserving browser legacy keys, archived OpenSpec evidence, other projects' historical evidence and root governance schema URLs exactly.

#### Scenario: Historical evidence is reviewed
- **WHEN** the final residual scan evaluates an archived Change or another project's evidence file
- **THEN** retained `dashboard` text SHALL be reported as historical evidence and SHALL not be rewritten as part of this Change
