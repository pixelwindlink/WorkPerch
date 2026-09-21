import { STORAGE_KEYS, state } from "./state.js";
import { storageGet, storageSet, showToast } from "./dom.js";
import { engineAction, patchInspection } from "./engine-client.js";
import { collectAbnormalPathIds } from "./path-status.js";

const THROTTLE_MS = 10 * 60 * 1000;
let running = false;

export async function maybeSilentRefreshPaths({ force = false } = {}) {
  if (!state.connected || running) return false;
  const lastAt = Number(storageGet(STORAGE_KEYS.silentRefreshAt) || 0);
  if (!force && Number.isFinite(lastAt) && Date.now() - lastAt < THROTTLE_MS) return false;
  running = true;
  try {
    const before = collectAbnormalPathIds(state.paths);
    const result = await engineAction("perch.path.refresh-all", { expectedRevision: state.aggregateRevision });
    state.aggregateRevision = result.aggregateRevision;
    for (const item of result.items || []) {
      if (item?.id && item.inspection) patchInspection("path", item.id, item.inspection);
    }
    storageSet(STORAGE_KEYS.silentRefreshAt, String(Date.now()));
    const { renderAll } = await import("./render-shared.js");
    renderAll();
    const after = collectAbnormalPathIds(state.paths);
    const gained = [...after].filter((id) => !before.has(id));
    if (gained.length > 0) {
      showToast(`发现 ${gained.length} 条新的异常路径`, 3200);
    }
    return true;
  } catch {
    return false;
  } finally {
    running = false;
  }
}

export function bindSilentPathRefresh() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") maybeSilentRefreshPaths();
  });
  window.addEventListener("focus", () => maybeSilentRefreshPaths());
}
