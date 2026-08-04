## Context

Dashboard 2.1 already exposes `dashboard.path.refresh-all`, per-path inspect/repair/delete, Finder open, shared tags, project upsert, and `usage` on entries. The Web UI is zero-bundler ES modules under `ui/`, with Desktop packing to `/Applications/Dashboard.app`. Users operate a narrow floating window daily; validity checks and disposition are still mostly manual.

## Goals / Non-Goals

**Goals:**
- Close the abnormal-path loop (filter → dispose) without inventing a file manager.
- Keep path validity fresh via throttled silent refresh; avoid toast spam.
- Keep the narrow header usable via overflow.
- Reduce path/project double-entry friction via promote + duplicate hint.
- Surface usage as a compact home strip on the paths panel.
- Preserve EngineMessage single-writer boundary and existing Action contracts where possible.

**Non-Goals:**
- Filesystem browser, recursive disk scan, or arbitrary path picking beyond existing drop/Finder flows.
- Shell execution or expanding Project Launcher privileges.
- New production dependencies or bundlers.
- Changing EngineMessage envelope or multi-writer semantics.
- Schema 3.0 / new persisted aggregate fields for home preferences (UI-local only).

## Decisions

1. **Abnormal disposition is UI orchestration over existing Actions**
   Quick filter sets `pathStatus` to a synthetic `abnormal` client filter (missing|denied|invalid). Batch delete confirms then sequentially calls `dashboard.path.delete` with refreshed `expectedRevision` after each success (same pattern as other multi-write UI loops). Open-parent uses Desktop Finder open on `dirname(path)` when available; otherwise copy parent path toast fallback is not required—show toast that Finder open needs Desktop.

2. **Silent refresh is UI policy, not a new Engine Action**
   After successful `loadSnapshot` and on `visibilitychange` → visible / window focus, call `dashboard.path.refresh-all` if last run older than 10 minutes (UI-localStorage key). Compare previous abnormal id set to new set; toast only when the set gains members. Never run when disconnected. Manual「刷新」remains and bypasses throttle.

3. **Header overflow**
   Below ~720px, move 保存视图/删除视图/旧数据/导出/导入 into a single「更多」menu (`<details>` or popover), keeping sort + view select + theme/pin visible. Pure CSS/JS in `header-layout.js`; no Engine changes.

4. **Path→Project promote**
   Row action opens existing project editor with `path`, `name`, and tags prefilled; user confirms via `dashboard.project.upsert`. Duplicate hint: if `comparablePath(path) === comparablePath(project.path)`, show a chip linking to reveal the project (switch tab + highlight). No automatic delete of the path.

5. **Usage home strip**
   Above the path list, render up to 5 recent (`lastUsedAt`) and up to 5 frequent (`count`) path entries as compact chips. Click focuses/reveals that path. Uses existing usage data only.

6. **Batch delete Action**
   Prefer sequential client deletes first. Add `dashboard.path.batch-delete` only if revision churn makes UX unreliable during implementation; otherwise skip to keep contract surface smaller.

## Risks / Trade-offs

- Silent refresh writes the aggregate each time → revision churn; mitigated by 10-minute throttle and single-writer queue.
- Sequential batch delete can partially succeed; toast must report deleted vs remaining, then reload snapshot on conflict.
- Overflow menu discoverability vs clutter—label「更多」and keep critical filters in sticky bar.
- Promote does not remove the path entry—users may still hold both; duplicate hint makes that visible without forcing merge.
