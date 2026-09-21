## 1. Freeze the Change and current identity

- [ ] 1.1 Validate the complete `rename-dashboard-to-perch-v1` proposal, design and delta specs with OpenSpec.
- [ ] 1.2 Record the pre-change Baseline/preflight failures, current Dashboard Git status and the existing README/prompt dirty files.
- [ ] 1.3 Commit only the Change artifacts in the independent Dashboard repository before implementation.

## 2. Rename Engine identity and public metadata

- [ ] 2.1 Rename manifest ID/name/description, package name/description, README/AGENT/architecture current self-references and current consumer declarations to `perch` / WorkPerch.
- [ ] 2.2 Rename the current Action Catalog namespace and all Action Schema filenames/references from `dashboard.*` to `perch.*` while preserving payload semantics.
- [ ] 2.3 Rename current schema `$id` URLs from `dashboard.local` to `perch.local`, leaving `generic-engines.local/schemas/governance/**` unchanged.
- [ ] 2.4 Rename current `DASHBOARD_*` environment variables and domain error codes to `PERCH_*`, including tests, UI, Electron and release tooling.

## 3. Rename source modules and implementation references

- [ ] 3.1 Use `git mv` for Engine-owned source/module filenames containing `dashboard` and update all current imports/exports.
- [ ] 3.2 Rename source constants, dispatcher routes, provider identity, composition-root symbols and current test fixtures to `perch`.
- [ ] 3.3 Rename state files, lock names, default runtime root and backup naming to `perch` equivalents without reading or staging runtime data.
- [ ] 3.4 Add repository-boundary one-time migration from `dashboard-state.json` to `perch-state.json`, retaining the old file and failing closed on corrupt legacy state.
- [ ] 3.5 Add migration tests for equivalent state, idempotent repeat initialization, retained legacy file and corrupt legacy failure.

## 4. Standardize the development server

- [ ] 4.1 Add `scripts.dev:server` invoking `node server.mjs`; retain `start` only as a compatibility alias.
- [ ] 4.2 Update the root server to use `PERCH_SERVER_HOST` / `PERCH_SERVER_PORT`, default loopback binding, bounded next-port fallback when unset and explicit-port fail-fast with `lsof` guidance.
- [ ] 4.3 Print the bound URL and primary routes and document `npm run dev:server`, default port and fallback semantics in README.
- [ ] 4.4 Add or update server tests for default bind, unset-port fallback, explicit-port conflict and non-loopback rejection.

## 5. Rename Skills and current Agent surfaces

- [ ] 5.1 Run Seshat Skill review/provenance for the current project-owned `operate-dashboard` Skill before changing its lifecycle.
- [ ] 5.2 Rename canonical `.agents/skills/operate-dashboard/` to `operate-perch/` and update its four files and manifest path.
- [ ] 5.3 Keep `register-project-entry` ID/path stable while updating its current Engine ID, Action and contract references; update its compatibility adapter and registration prompt.
- [ ] 5.4 Run live Skill discovery and Seshat review after the rename; record any unsupported forward-evaluation evidence without claiming automatic triggering.

## 6. Rename Electron, release and UI surfaces

- [ ] 6.1 Rename current WorkPerch UI titles, diagnostics, app display name, DMG name and macOS bundle ID to `local.ugreen.perch`.
- [ ] 6.2 Update Electron/server coordinator environment and endpoint names to `PERCH_*` and preserve the narrow Project Launcher EngineClient boundary.
- [ ] 6.3 Update release/package scripts and current documentation while excluding runtime data, archives and historical evidence.

## 7. Move the independent repository

- [ ] 7.1 Re-run Engine checks and residual classification while the repository is still at `engine_projects/dashboard`.
- [ ] 7.2 Move the directory with `mv engine_projects/dashboard engine_projects/engine-perch`; record the actual exit code and verify the same independent `.git` repository remains intact.
- [ ] 7.3 Re-run Baseline and dev-server preflight against `engine_projects/engine-perch` and confirm directory naming passes.

## 8. Update Generic Engines root references

- [ ] 8.1 Update current Governance Registry, generated Skill index, conformance parameters, Runtime references and onboarding/docs from `dashboard` to `perch` / `engine-perch`.
- [ ] 8.2 Leave `openspec/changes/archive/**`, other projects' historical evidence, browser `local-dashboard.*` keys and governance schema URLs unchanged; list each retained occurrence in the report.
- [ ] 8.3 Keep root changes separate from the Engine repository commit and do not stage unrelated root worktree changes.

## 9. Verification and handoff

- [ ] 9.1 Run `node conformance/baseline-validator.mjs --engine-root engine_projects/engine-perch --json` and confirm `engine-project-server-directory-naming` passes.
- [ ] 9.2 Run `npm run check`, `npm test` and `openspec validate --all --json` in `engine_projects/engine-perch`.
- [ ] 9.3 Run `node conformance/runner.mjs --engine perch --static-only` from the Generic Engines root and classify unrelated pre-existing failures separately.
- [ ] 9.4 Run final current-file residual scans for `dashboard` / `DASHBOARD`, classify deliberate historical/legacy occurrences and write the completion report with file counts, migration evidence, command output and exit codes.
- [ ] 9.5 Commit the completed Engine rename on its own `main` branch and commit root governance updates separately.
