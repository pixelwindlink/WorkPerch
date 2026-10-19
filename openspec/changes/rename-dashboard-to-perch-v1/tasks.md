## 1. Freeze the Change and current identity

- [x] 1.1 Validate the complete `rename-dashboard-to-perch-v1` proposal, design and delta specs with OpenSpec.（证据：2026-10-19 `openspec validate rename-dashboard-to-perch-v1 --strict --json`，1/1 passed，exit 0。）
- [ ] 1.2 Record the pre-change Baseline/preflight failures, current Dashboard Git status and the existing README/prompt dirty files.（未勾：Change 内没有找到实施前 Baseline/preflight、Git status 与 dirty 文件的完整记录。）
- [x] 1.3 Commit only the Change artifacts in the independent Dashboard repository before implementation.（证据：`e57465e` 只新增 `rename-dashboard-to-perch-v1` 的 11 个 Change 文件。）

## 2. Rename Engine identity and public metadata

- [ ] 2.1 Rename manifest ID/name/description, package name/description, README/AGENT/architecture current self-references and current consumer declarations to `perch` / WorkPerch.（未勾：`b0ba6bc` 曾完成 `perch`/WorkPerch 改名，但后续 `876f50b` 将当前项目 ID/package 改为 `work-perch`；本 Change 原定身份规格当前漂移，归档前需另行裁决。）
- [x] 2.2 Rename the current Action Catalog namespace and all Action Schema filenames/references from `dashboard.*` to `perch.*` while preserving payload semantics.（证据：`b0ba6bc` 的 Schema rename；当前 Catalog/Schema 与 60/60 tests 使用 `perch.*`。）
- [x] 2.3 Rename current schema `$id` URLs from `dashboard.local` to `perch.local`, leaving `generic-engines.local/schemas/governance/**` unchanged.（证据：当前 contracts 无 `dashboard.local`，manifest 治理 Schema 仍为 `generic-engines.local/schemas/governance/**`。）
- [x] 2.4 Rename current `DASHBOARD_*` environment variables and domain error codes to `PERCH_*`, including tests, UI, Electron and release tooling.（证据：`b0ba6bc`；当前实现使用 `PERCH_*`，保留项仅为显式 legacy/browser 历史标识。）

## 3. Rename source modules and implementation references

- [x] 3.1 Use `git mv` for Engine-owned source/module filenames containing `dashboard` and update all current imports/exports.（证据：`b0ba6bc` 记录 application/composition/domain/engine/repository 等 R-status rename。）
- [ ] 3.2 Rename source constants, dispatcher routes, provider identity, composition-root symbols and current test fixtures to `perch`.（未勾：Action/模块符号已改为 `perch`，但当前 Provider/dispatcher Engine identity 仍为 `work-perch`，受 `876f50b` 后续身份调整影响；check 与 60/60 tests 只证明当前合同自洽。）
- [x] 3.3 Rename state files, lock names, default runtime root and backup naming to `perch` equivalents without reading or staging runtime data.（证据：`json-perch-repository.mjs`、`state-lock.mjs`、README；本次核验未读取 `runtime_data/`。）
- [x] 3.4 Add repository-boundary one-time migration from `dashboard-state.json` to `perch-state.json`, retaining the old file and failing closed on corrupt legacy state.（证据：`src/outbound/json-perch-repository.mjs` 的 legacy boundary 与 `PERCH_STATE_CORRUPT` fail-closed 分支。）
- [ ] 3.5 Add migration tests for equivalent state, idempotent repeat initialization, retained legacy file and corrupt legacy failure.（未勾：现有 migration test 覆盖等价状态、重复初始化和 legacy 文件保留，但没有只含损坏 `dashboard-state.json` 的专用失败用例。）

## 4. Standardize the development server

- [x] 4.1 Add `scripts.dev:server` invoking `node server.mjs`; retain `start` only as a compatibility alias.（证据：`package.json` 两个 script 均指向 `node server.mjs`。）
- [x] 4.2 Update the root server to use `PERCH_SERVER_HOST` / `PERCH_SERVER_PORT`, default loopback binding, bounded next-port fallback when unset and explicit-port fail-fast with `lsof` guidance.（证据：`server.mjs` 的 loopback allowlist、32 次 bounded ports 与 EADDRINUSE/lsof 错误文案。）
- [ ] 4.3 Print the bound URL and primary routes and document `npm run dev:server`, default port and fallback semantics in README.（未勾：Server 会打印 bound URL，但未打印 primary routes；README 仍以 `PERCH_HOST`/`PERCH_PORT` 为主要说明，未完整说明 `PERCH_SERVER_*` 与 fallback。）
- [ ] 4.4 Add or update server tests for default bind, unset-port fallback, explicit-port conflict and non-loopback rejection.（未勾：未找到覆盖这四个场景的专用 Server 测试；现有 HTTP E2E 使用随机端口。）

## 5. Rename Skills and current Agent surfaces

- [ ] 5.1 Run Seshat Skill review/provenance for the current project-owned `operate-dashboard` Skill before changing its lifecycle.（未勾：没有找到 rename 前的 Seshat review/provenance 结果。）
- [x] 5.2 Rename canonical `.agents/skills/operate-dashboard/` to `operate-perch/` and update its four files and manifest path.（证据：`b0ba6bc` rename，当前 canonical atom 与 manifest path 均为 `operate-perch`。）
- [x] 5.3 Keep `register-project-entry` ID/path stable while updating its current Engine ID, Action and contract references; update its compatibility adapter and registration prompt.（证据：`b0ba6bc` 与当前 contract tests。）
- [ ] 5.4 Run live Skill discovery and Seshat review after the rename; record any unsupported forward-evaluation evidence without claiming automatic triggering.（未勾：2026-10-19 live discovery 为 ok，但未找到完整 Seshat review；sidecar 仍为 `lifecycle=proposed`，投影为 unregistered/unsupported-environment。）

## 6. Rename Electron, release and UI surfaces

- [x] 6.1 Rename current WorkPerch UI titles, diagnostics, app display name, DMG name and macOS bundle ID to `local.ugreen.perch`.（证据：`b0ba6bc`、`scripts/package-desktop.mjs` 与当前 ad-hoc Perch.app。）
- [x] 6.2 Update Electron/server coordinator environment and endpoint names to `PERCH_*` and preserve the narrow Project Launcher EngineClient boundary.（证据：Electron source、manifest allowlisted Launcher Actions 与 launcher integration tests。）
- [x] 6.3 Update release/package scripts and current documentation while excluding runtime data, archives and historical evidence.（证据：package ignore 列表排除 runtime/OpenSpec/skills；2026-10-19 README 已改为只宣称实际 Perch App 开发产物，历史 Dashboard DMG 明确不作当前安装包。）

## 7. Move the independent repository

- [ ] 7.1 Re-run Engine checks and residual classification while the repository is still at `engine_projects/dashboard`.（未勾：`b0ba6bc` body 记录 tests/validate 通过，但没有可复核的旧路径命令输出与残留分类报告。）
- [ ] 7.2 Move the directory with `mv engine_projects/dashboard engine_projects/engine-perch`; record the actual exit code and verify the same independent `.git` repository remains intact.（未勾：旧路径已不存在且独立 Git 历史仍在，但没有实际 `mv` 退出码记录；现行路径后来又改为 `engine-work-perch`。）
- [ ] 7.3 Re-run Baseline and dev-server preflight against `engine_projects/engine-perch` and confirm directory naming passes.（未勾：没有旧目标路径的可复核结果；2026-10-19 对现行 `engine-work-perch` 的 Baseline 因 manifest 1.2 被 1.3 admission 拒绝，naming check skipped。）

## 8. Update Generic Engines root references

- [ ] 8.1 Update current Governance Registry, generated Skill index, conformance parameters, Runtime references and onboarding/docs from `dashboard` to `perch` / `engine-perch`.（未勾：根提交 `04d0c08` 曾按 `perch`/`engine-perch` 更新，后续 `1f1430a` 又将当前身份调整为 `work-perch`/`engine-work-perch`；最终现状不再满足本项原定命名。）
- [x] 8.2 Leave `openspec/changes/archive/**`, other projects' historical evidence, browser `local-dashboard.*` keys and governance schema URLs unchanged; list each retained occurrence in the report.（证据：2026-10-19 residual scan；保留项分类为 legacy state migration、`local-dashboard.*` 浏览器键、历史/仍开放 Dashboard-named Changes、rename Change 自身与任务单引用。）
- [x] 8.3 Keep root changes separate from the Engine repository commit and do not stage unrelated root worktree changes.（证据：Engine `b0ba6bc`/`876f50b` 与根 `04d0c08`/`1f1430a` 分属独立仓提交。）

## 9. Verification and handoff

- [ ] 9.1 Run `node conformance/baseline-validator.mjs --engine-root engine_projects/engine-perch --json` and confirm `engine-project-server-directory-naming` passes.（未勾：无旧路径通过证据；2026-10-19 现行路径验证 exit 1，manifest 1.2 不满足 1.3，directory naming 未执行。）
- [x] 9.2 Run `npm run check`, `npm test` and `openspec validate --all --json` in `engine_projects/engine-perch`.（证据：`b0ba6bc` 记录 60/60 与 15/15；2026-10-19 在后续 canonical 路径 `engine-work-perch` 再验 check exit 0、tests 60/60、validate 15/15。）
- [ ] 9.3 Run `node conformance/runner.mjs --engine perch --static-only` from the Generic Engines root and classify unrelated pre-existing failures separately.（未勾：未找到旧 Engine ID 的通过证据；2026-10-19 现行 `work-perch --static-only --json` exit 1，根治理失败且 Engine checks 未执行。）
- [x] 9.4 Run final current-file residual scans for `dashboard` / `DASHBOARD`, classify deliberate historical/legacy occurrences and write the completion report with file counts, migration evidence, command output and exit codes.（证据：2026-10-19 扫描排除 archive/runtime/dist/release 后命中 34 个文件；均归入 legacy migration/browser keys、历史或开放 Change、rename 自身与任务单引用，未发现 active `DASHBOARD_*` 环境变量或 `dashboard.local` Schema ID。）
- [x] 9.5 Commit the completed Engine rename on its own `main` branch and commit root governance updates separately.（证据：Engine `b0ba6bc` 与根 `04d0c08` 为分仓提交；后续身份调整也分别为 `876f50b` 与 `1f1430a`。）
