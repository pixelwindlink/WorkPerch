## Context

The current repository is an independently versioned, server-capable Engine located at `engine_projects/dashboard`. The Generic Engines Baseline requires server-capable projects to live at `engine-{simple-name}`, so the physical root must become `engine_projects/engine-perch`. The public Engine identity, Action namespace, environment namespace, state filenames, Skill identity and macOS bundle metadata must move together; changing only the directory would leave incompatible contracts and stale operator instructions.

The architecture authority is `../../../../openspec/architecture/generic-engine-runtime-architecture.md`. This Change keeps the Engine as an independently owned Provider/Dispatcher/Business Core. It does not move business state into Generic Engines, create a second Registry, or import another Engine's implementation.

## Goals / Non-Goals

**Goals:**

- Establish the three-layer rename: display name `WorkPerch`, Engine ID `perch`, physical root `engine-perch`.
- Preserve Action semantics and state ownership while changing current public names from `dashboard.*` / `DASHBOARD_*` to `perch.*` / `PERCH_*`.
- Make the server workflow satisfy the Engine dev-server contract with `npm run dev:server`, loopback defaults, explicit-port fail-fast and unset-port fallback.
- Migrate an existing `dashboard-state.json` exactly once through the repository's validated atomic write path when `perch-state.json` is absent, retaining the old file.
- Keep browser legacy keys and archived historical evidence unchanged.
- Update current root-governance references only after the independent Engine repository is internally consistent.

**Non-Goals:**

- Do not change business capability semantics, aggregate schema, Action payload shape, Provider SPI, EngineMessage v1.0 or Project Launcher ownership.
- Do not rewrite `openspec/changes/archive/**` or other projects' historical admission/verification evidence.
- Do not alter `local-dashboard.paths.v1`, `local-dashboard.notes.v1`, or `local-dashboard.theme.v1`.
- Do not promote Registry status, claim conformance, or make Runtime state persistent.

## Decisions

### 1. Use `perch` as the Engine ID and `engine-perch` as the physical root

The product display name is WorkPerch, but the governed simple name is `perch`. The Baseline's server-directory rule requires `engine-{simple-name}`, making `engine-perch` the only approved physical destination among the requested names. `work-perch` is rejected because it would imply simple name `work-perch` and does not match the agreed Engine identity.

Alternative: retain `dashboard` and only move to `engine-dashboard`. Rejected because the request explicitly establishes a new current Engine identity and would leave the product/API naming debt in place.

### 2. Treat the rename as a current Contract migration, not a compatibility alias

All current manifest, catalog, schema filename, source, UI, tests, Skill and operator references move to `perch` / `PERCH`. Historical archives remain unchanged. No dual Action namespace is added because that would create two current public contracts and duplicate conformance surface.

Alternative: accept both namespaces indefinitely. Rejected because the goal is to make the identity and Baseline result unambiguous; callers must update to the new Engine contract.

### 3. Add one-time state migration at the Repository boundary

`JsonPerchRepository.initialize()` first checks for `perch-state.json`. If absent and `dashboard-state.json` exists, it validates the old aggregate, writes the same aggregate through the existing temporary-file, fsync, backup and atomic-rename path under the new filename, and leaves the old file untouched. If both are absent, normal first-run initialization creates the new state. If the old file is corrupt, the Engine fails closed and does not create a replacement state.

The old state file is retained as recovery evidence; future writes target only `perch-state.json`. A marker is unnecessary because the presence of the new file makes the migration idempotent.

Alternative: require manual file moves. Rejected because it makes existing users appear to lose all catalog data and bypasses the repository's validation/atomicity guarantees.

### 4. Make the root server obey the canonical dev-server contract

`server.mjs` reads `PERCH_SERVER_HOST` and `PERCH_SERVER_PORT`, defaulting to loopback and the current documented default port. When the port variable is unset, `EADDRINUSE` selects the next free port for a bounded number of attempts and prints the selected URL. When an explicit port is set, the server fails with a clear conflict message and `lsof` hint. `npm start` remains as a compatibility alias but README leads with `npm run dev:server`.

### 5. Rename source files with `git mv` before import rewrites

Engine-owned module filenames containing `dashboard` move to `perch` equivalents with Git history preserved. Imports are then rewritten mechanically and verified by a repository-wide current-file scan. This avoids a second duplicate module identity and keeps the Composition Root as the only concrete Adapter selection point.

### 6. Govern Skill rename before changing the canonical directory

The existing `operate-dashboard` Skill is a current project-owned capability and must be reviewed by Seshat before its lifecycle change. Its canonical directory and four files move to `operate-perch`; the `register-project-entry` Skill ID remains unchanged and only its current Action/identity references are updated. The old `operate-dashboard` path is not retained as a second canonical behavior Authority.

### 7. Update root references only after the Engine move

The independent Engine repository is changed and tested first. Then the Generic Engines root updates current Registry/generated/conformance/runtime/onboarding references from `dashboard` to `perch` and from `engine_projects/dashboard` to `engine_projects/engine-perch`. Archived evidence and unrelated historical files are excluded by path and explicit residual review.

## Risks / Trade-offs

- [External callers still use `dashboard.*`] → The change is explicitly breaking; report all current non-archived callers and update governed root references in the same integration window.
- [Existing users have only the old state file] → One-time validated atomic migration retains the old file and is covered by dedicated tests.
- [A stale `DASHBOARD_*` variable silently changes behavior] → The server reads only `PERCH_*`; README and error messages document the new namespace, and residual scans list deliberate historical strings.
- [A source filename rename breaks an import or packaging path] → Use `git mv`, run syntax/unit/contract/integration/e2e tests and inspect package/release manifests.
- [Skill rename breaks an Agent entry] → Update manifest, canonical Skill, compatibility adapter and prompt references together; run Seshat review and live Skill discovery.
- [Root has unrelated dirty changes] → Do not stage or rewrite unrelated root files; root governance changes are a separate later commit.

## Migration Plan

1. Create and validate this Change; commit only the Change artifacts in the current Dashboard repository before code changes.
2. Review Skill provenance and complete the current Engine rename inside `engine_projects/dashboard` without reading or modifying runtime data.
3. Add Repository migration and dev-server handling; update tests and README/AGENT/operator references.
4. Run the Engine checks, OpenSpec validation, Seshat Skill review, and residual scans while the repository is still at the old physical path.
5. Move the independent repository with `mv engine_projects/dashboard engine_projects/engine-perch`; verify its `.git` remains the same repository and run Baseline again.
6. Update current Generic Engines root references in a separate root-repository change/commit; do not edit historical archive evidence.
7. If rollback is needed, stop at the boundary before root-reference update, move the repository back, and restore the previous current contract from the dedicated commit. Never delete the retained legacy state file.

## Open Questions

- Existing external callers outside the Generic Engines workspace may need to migrate separately; this Change only updates discoverable current references found by the final scans.
- A future compatibility period could add an explicit adapter Engine, but that is out of scope and requires a separate Contract Change.
