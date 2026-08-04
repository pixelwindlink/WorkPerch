## Why

Dashboard already supports path inspection, refresh-all, tags, launcher, and usage tracking, but daily use still has gaps: abnormal paths lack a disposition loop, validity drifts until the user remembers to refresh, the narrow header is cluttered, path/project overlap is easy to miss, and usage data is not surfaced as a cold-start home.

## What Changes

- Add an abnormal-path disposition workflow: quick filter to abnormal statuses, per-row repair/open-parent/delete, and batch delete of currently visible abnormal paths (with confirm).
- Add silent path validity refresh on Desktop/Web focus and after successful connect, throttled in UI-local preference storage; toast only when newly abnormal IDs appear.
- Collapse low-frequency header tools into an overflow menu on narrow widths so the first row stays usable.
- Add path→project promote from a path row (opens project editor prefilled from the path); surface duplicate path↔project hints on path rows when the same absolute path is already a project entry.
- Add a compact “最近 / 常用” home strip on the paths panel driven by existing `usage` fields (no new Engine state schema).
- **Non-goals (boundary):** no filesystem browser, no arbitrary shell execution, no global disk scan, no second writer, no production bundler/deps.

## Capabilities

### New Capabilities

- `abnormal-path-disposition`: UI + EngineMessage-backed workflow to filter and dispose abnormal path entries
- `silent-path-refresh`: throttled background `dashboard.path.refresh-all` with new-abnormal-only notifications
- `narrow-header-overflow`: responsive header tool collapse without losing actions
- `path-project-convergence`: promote path to project entry and duplicate-path hints
- `usage-home-surface`: recent/frequent strip using existing usage metadata

### Modified Capabilities

- `dashboard-interaction-ux`: sticky path toolbar gains abnormal quick actions and refresh affordances without breaking high-density KV layout
- `dashboard-runtime-refresh`: local afterWrite patches support bulk inspection updates used by silent refresh

## Impact

- UI: `index.html`, `styles.css`, `ui/events.js`, `ui/render-paths.js`, `ui/engine-client.js`, `ui/header-layout.js`, `ui/dialogs-project.js`, possibly new `ui/usage-home.js`
- Engine: prefer reusing `dashboard.path.refresh-all`, `dashboard.path.repair`, `dashboard.path.delete`, `dashboard.project.upsert`; add `dashboard.path.batch-delete` only if sequential deletes are insufficient for revision safety
- Contracts/tests/e2e updated for new UI markers and any new Action
- Desktop pack to `/Applications/Dashboard.app` after verification
