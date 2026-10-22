## Why

Dashboard is a server-capable Engine (`http` transport plus root `server.mjs`) whose physical directory violates Engine Project Baseline §8: `engine_projects/dashboard` does not match the mandatory `engine-{simple-name}` form. The rename also needs to remove the ambiguous generic product identity while preserving existing user state and browser legacy migration data.

This Change is governed by the architecture authority `../../../../openspec/architecture/generic-engine-runtime-architecture.md`: the Engine remains independently state-owning, Provider-compatible, and reachable only through its public EngineMessage and EngineClient boundaries.

## What Changes

- **BREAKING** Rename the current Engine identity from `dashboard` / Dashboard Engine to Engine ID `perch` and product display name **WorkPerch**.
- **BREAKING** Rename all public Engine-owned Actions from `dashboard.*` to `perch.*`, including Action Catalog entries, payload Schema filenames and program consumer declarations.
- **BREAKING** Rename Engine-owned environment variables and domain error codes from `DASHBOARD_*` to `PERCH_*`.
- Move the independent repository from `engine_projects/dashboard` to the Baseline-compliant `engine_projects/engine-perch`; `perch` is the governed simple name while WorkPerch remains display-only.
- Rename Engine-owned modules, package/bundle identifiers, Skill identity (`operate-dashboard` → `operate-perch`), state filenames, default runtime root and release artifacts.
- Add the canonical `npm run dev:server` workflow with `PERCH_SERVER_HOST` / `PERCH_SERVER_PORT`, default loopback binding and automatic next-port fallback only when no explicit port is configured.
- Add one-time state migration: when the new state file is absent but the old state file exists in the same runtime root, migrate through the repository's validated atomic commit path and retain the legacy file as recovery evidence.
- Preserve browser legacy keys `local-dashboard.paths.v1`, `local-dashboard.notes.v1`, and `local-dashboard.theme.v1` exactly so existing Application data remains discoverable.
- Update current root-governance Registry, generated views, Runtime references and conformance inputs to `perch` / `engine-perch` without rewriting archived or historical evidence.
- The Engine repository and Generic Engines root repository remain separate Git histories and receive separate commits.

## Capabilities

### New Capabilities

- `workperch-engine-identity`: Defines the WorkPerch display identity, stable Engine ID `perch`, Baseline-compliant physical root, current package/bundle naming and non-historical rename boundaries.

### Modified Capabilities

- `dashboard-engine-boundary`: Renames the current Engine boundary and Provider/consumer identity while retaining the existing responsibility and cross-Engine isolation rules.
- `dashboard-engine-actions`: Renames the public Action namespace from `dashboard.*` to `perch.*` without changing the underlying business capabilities.
- `dashboard-engine-state`: Renames Engine-owned runtime variables, state files and default runtime root, and requires lossless one-time legacy-state migration.
- `dashboard-engine-transports`: Renames transport configuration and adds the governed `dev:server` command and port-conflict behavior.
- `dashboard-agent-skills`: Replaces `operate-dashboard` with `operate-perch` while keeping `register-project-entry` and updating its Action references.
- `dashboard-legacy-migration`: Keeps the historical `local-dashboard.*` browser keys unchanged across the Engine rename.

## Impact

- Engine repository: manifest, package metadata, README/AGENT/architecture docs, Action Catalog and Schemas, source modules, adapters, UI, Electron host, tests, Skills, prompts, release tooling and current non-archived OpenSpec assets.
- Filesystem/runtime: repository root becomes `engine_projects/engine-perch`; state and lock filenames become `perch-state.json` and `.perch-owner.lock`; default state root becomes `~/.local/share/perch-engine`.
- Public callers: requests must target Engine `perch` and use `perch.*` Actions; `DASHBOARD_*` deployment configuration is replaced by `PERCH_*`.
- Root governance: current Registry, manifest references, generated Skill projection, conformance parameters, Runtime references and current onboarding documents must resolve the new identity/path.
- Historical archives and other projects' immutable admission/verification evidence remain unchanged.
