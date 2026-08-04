import { state, STORAGE_KEYS } from "./state.js";
import { elements, messageId, showToast, storageSet } from "./dom.js";
import { renderAll } from "./render-shared.js";
import { inspectLegacyData } from "./backup-legacy.js";
import { refreshProjectStatuses, refreshLauncherStatuses } from "./render-projects.js";

export const LAUNCHER_UNAVAILABLE_GUIDANCE = "Project Launcher 未接入。启动/停止请用 Dashboard.app（并确认已打包 Launcher 资源）；路径、速记和项目目录管理不受影响。";

export class EngineClientError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EngineClientError";
    this.code = code;
  }
}

export function switchTab(name, updateHash = true) {
  const tab = ["paths", "launcher", "notes"].includes(name) ? name : "paths";
  state.activeTab = tab;
  elements.tabs.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === tab));
  elements.panels.forEach((item) => item.classList.toggle("is-active", item.dataset.panel === tab));
  if (updateHash) history.replaceState(null, "", `#${tab}`);
  storageSet(STORAGE_KEYS.activeTab, tab);
}

export function setConnectionStatus(kind, title, message) {
  state.connecting = kind === "connecting";
  state.connected = kind === "connected";
  elements.connectionBanner.dataset.state = kind;
  document.querySelector("#connectionTitle").textContent = title;
  document.querySelector("#connectionMessage").textContent = message;
  elements.workspace.dataset.readonly = String(!state.connected);
  for (const id of ["addPathButton", "addNoteButton", "addProjectButton", "exportButton"]) {
    document.querySelector(`#${id}`).disabled = !state.connected;
  }
  const importLabel = document.querySelector('label[for="importInput"]');
  importLabel.classList.toggle("is-disabled", !state.connected);
  document.querySelector("#importInput").disabled = !state.connected;
}

export function knownTagIds(tagIds = []) {
  const known = new Set(state.tags.map((tag) => tag.id));
  return tagIds.every((id) => known.has(id));
}

export function upsertLocalItem(collectionName, item) {
  const collection = state[collectionName];
  if (!Array.isArray(collection) || !item?.id) return;
  const index = collection.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) collection[index] = item;
  else collection.push(item);
}

export function removeLocalItem(collectionName, id) {
  if (!Array.isArray(state[collectionName])) return;
  state[collectionName] = state[collectionName].filter((candidate) => candidate.id !== id);
}

export function patchInspection(kind, id, inspection) {
  const collection = kind === "project" ? state.projects : state.paths;
  const item = collection.find((candidate) => candidate.id === id);
  if (item) item.inspection = inspection;
}

async function refreshProbes() {
  refreshProjectStatuses();
  refreshLauncherStatuses({ silent: true });
}

export async function engineAction(action, payload = {}) {
  if (location.protocol === "file:") throw new EngineClientError("ENGINE_DISCONNECTED", "直接打开 HTML 时没有 Dashboard Engine Server。");
  const request = {
    protocol: "generic-engines/engine-message",
    version: "1.0",
    kind: "request",
    id: messageId(),
    engine: "dashboard",
    action,
    payload,
  };
  let response;
  try {
    response = await fetch("/engine-message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch {
    throw new EngineClientError("ENGINE_DISCONNECTED", "无法连接 Dashboard Engine Server。");
  }
  let result;
  try { result = await response.json(); } catch { throw new EngineClientError("TRANSPORT_ERROR", `Server 返回了非 JSON 响应（HTTP ${response.status}）。`); }
  if (!response.ok) throw new EngineClientError(result?.error?.code || "TRANSPORT_ERROR", result?.error?.message || `HTTP ${response.status}`);
  if (result?.kind !== "response" || result.id !== request.id || result.engine !== request.engine || result.action !== request.action) {
    throw new EngineClientError("TRANSPORT_ERROR", "Server 返回的 EngineMessage 关联字段不合法。");
  }
  if (result.status === "error") throw new EngineClientError(result.error.code, result.error.message);
  if (result.status !== "ok" || !result.payload || typeof result.payload !== "object") {
    throw new EngineClientError("TRANSPORT_ERROR", "Server 返回的 EngineMessage 状态不合法。");
  }
  return result.payload;
}

export async function loadSnapshot({ silent = false, probe = true } = {}) {
  if (!silent) setConnectionStatus("connecting", "正在连接 Dashboard Engine…", "正在读取 Engine-owned workspace snapshot。");
  try {
    const snapshot = await engineAction("dashboard.snapshot.get", {});
    state.aggregateRevision = snapshot.aggregateRevision;
    state.snapshotUpdatedAt = snapshot.updatedAt || "";
    state.tags = snapshot.tags || [];
    state.paths = snapshot.paths || [];
    state.notes = snapshot.notes || [];
    state.projects = snapshot.projects || [];
    state.savedViews = snapshot.savedViews || [];
    setConnectionStatus("connected", "已连接", `revision ${state.aggregateRevision}`);
    renderAll();
    inspectLegacyData();
    if (probe) {
      refreshProjectStatuses();
      refreshLauncherStatuses({ silent: true });
    }
    if (!silent) {
      import("./silent-refresh.js").then(({ maybeSilentRefreshPaths }) => maybeSilentRefreshPaths()).catch(() => {});
    }
    return true;
  } catch (error) {
    setConnectionStatus("error", "Dashboard Engine 未连接", error.message || "请通过 npm start 启动 Server，然后重试。");
    renderAll();
    if (!silent) showToast("当前为只读连接失败状态", 2600);
    return false;
  }
}

export async function afterWrite(message, { probe = false, result = null, patch = null } = {}) {
  const mode = patch?.type || "snapshot";
  let usedSnapshot = false;

  if (mode === "upsert" && result?.item && patch.collection) {
    if (Array.isArray(result.item.tagIds) && !knownTagIds(result.item.tagIds)) {
      await loadSnapshot({ silent: true, probe });
      usedSnapshot = true;
    } else {
      state.aggregateRevision = result.aggregateRevision;
      upsertLocalItem(patch.collection, result.item);
      renderAll();
    }
  } else if (mode === "delete" && (result?.deletedId || patch?.id) && patch.collection) {
    state.aggregateRevision = result?.aggregateRevision ?? state.aggregateRevision;
    removeLocalItem(patch.collection, result?.deletedId || patch.id);
    if (patch.collection === "savedViews" && state.activeViewId === (result?.deletedId || patch.id)) state.activeViewId = "";
    renderAll();
  } else if (mode === "inspection" && result?.inspection && patch.id) {
    state.aggregateRevision = result.aggregateRevision;
    patchInspection(patch.kind || "path", patch.id, result.inspection);
    renderAll();
  } else if (mode === "inspections" && Array.isArray(result?.items)) {
    state.aggregateRevision = result.aggregateRevision;
    for (const item of result.items) {
      if (item?.id && item.inspection) patchInspection(patch.kind || "path", item.id, item.inspection);
    }
    renderAll();
  } else {
    await loadSnapshot({ silent: true, probe });
    usedSnapshot = true;
  }

  if (probe && !usedSnapshot) await refreshProbes();
  showToast(message);
}

export async function handleWriteError(error, preservedMessage = "操作失败") {
  if (error.code === "DASHBOARD_REVISION_CONFLICT") {
    await loadSnapshot({ silent: true, probe: false });
    showToast("数据已被其他客户端更新；已刷新，请检查输入后重试", 3200);
    return;
  }
  if (error.code === "ENGINE_DISCONNECTED" || error.code === "TRANSPORT_ERROR") {
    setConnectionStatus("error", "Dashboard Engine 连接中断", error.message);
  }
  showToast(`${preservedMessage}：${error.message}`, 3200);
}

export async function recordUsage(kind, id) {
  if (!state.connected || !id) return;
  try {
    const result = await engineAction("dashboard.entry.usage.record", { kind, id });
    state.aggregateRevision = result.aggregateRevision;
    const collection = kind === "path" ? state.paths : kind === "note" ? state.notes : state.projects;
    const item = collection.find((candidate) => candidate.id === id);
    if (item) item.usage = result.usage;
    renderAll();
  } catch (error) {
    if (error.code === "DASHBOARD_REVISION_CONFLICT") await loadSnapshot({ silent: true, probe: false });
  }
}

export async function copyText(text, label = "VALUE", usage = null) {
  const fallback = () => {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  };
  const operation = navigator.clipboard?.writeText(text) || Promise.reject(new Error("Clipboard unavailable"));
  try {
    await operation;
    showToast(`${label} 已复制`);
  } catch {
    fallback();
    showToast(`${label} 已复制`);
  }
  if (usage) await recordUsage(usage.kind, usage.id);
}
