import { state } from "./state.js";
import { escapeHtml, normalize, tagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, switchTab } from "./engine-client.js";
import { renderPathGroups, renderPaths } from "./render-paths.js";
import { renderProjects } from "./render-projects.js";
import { renderNotes } from "./render-notes.js";
import { renderGroupRegistry } from "./dialogs-tag-registry.js";
import { elements } from "./dom.js";
import { requestConfirm } from "./confirm.js";

export function compareRecords(a, b, nameOf = (item) => item.name || item.title || "") {
  const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pinned) return pinned;
  const aUsed = a.usage?.lastUsedAt ? Date.parse(a.usage.lastUsedAt) : 0;
  const bUsed = b.usage?.lastUsedAt ? Date.parse(b.usage.lastUsedAt) : 0;
  const aCount = a.usage?.count || 0;
  const bCount = b.usage?.count || 0;
  if (state.sortMode === "recent") return bUsed - aUsed || nameOf(a).localeCompare(nameOf(b), "zh-CN") || a.id.localeCompare(b.id);
  if (state.sortMode === "frequent") return bCount - aCount || bUsed - aUsed || nameOf(a).localeCompare(nameOf(b), "zh-CN") || a.id.localeCompare(b.id);
  if (state.sortMode === "name") return nameOf(a).localeCompare(nameOf(b), "zh-CN") || a.id.localeCompare(b.id);
  if (state.sortMode === "updated") return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id);
  const referenceTime = Date.parse(state.snapshotUpdatedAt) || 0;
  const aSmart = (aUsed ? Math.min(30, Math.max(0, 30 - ((referenceTime - aUsed) / 86400000))) : 0) + Math.log2(aCount + 1) * 4;
  const bSmart = (bUsed ? Math.min(30, Math.max(0, 30 - ((referenceTime - bUsed) / 86400000))) : 0) + Math.log2(bCount + 1) * 4;
  return bSmart - aSmart || Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || nameOf(a).localeCompare(nameOf(b), "zh-CN") || a.id.localeCompare(b.id);
}

export function inspectionLabel(item) {
  const inspection = item.inspection;
  if (!inspection) return "未检查";
  const labels = { available: "有效", missing: "已移动/删除", denied: "无权限", invalid: "无效" };
  const kind = { file: "文件", directory: "目录", other: "其他", unknown: "" }[inspection.kind] || "";
  return `${labels[inspection.status] || inspection.status}${kind ? ` · ${kind}` : ""}${inspection.gitRoot ? " · Git" : ""}`;
}

export function renderAll() {
  renderPathGroups();
  renderPaths();
  renderProjects();
  renderNotes();
  renderSavedViews();
  if (elements.groupRegistryDialog?.open) renderGroupRegistry();
}

export function renderSavedViews() {
  const select = document.querySelector("#savedViewSelect");
  const views = [...state.savedViews].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  select.innerHTML = '<option value="">当前视图</option>' + views.map((view) => `<option value="${escapeHtml(view.id)}">${escapeHtml(view.name)}</option>`).join("");
  if (!views.some((view) => view.id === state.activeViewId)) state.activeViewId = "";
  select.value = state.activeViewId;
  document.querySelector("#deleteViewButton").hidden = !state.activeViewId;
  document.querySelector("#sortMode").value = state.sortMode;
}

export function activateSavedView(id) {
  state.activeViewId = id;
  const view = state.savedViews.find((item) => item.id === id);
  if (!view) return renderAll();
  state.sortMode = view.sort;
  if (view.scope === "paths") {
    switchTab("paths"); state.pathSearch = view.query; state.pathCategory = view.tagIds[0] || "all"; state.pathStatus = view.pathStatus;
    document.querySelector("#pathSearch").value = state.pathSearch;
    document.querySelector("#pathStatusFilter").value = state.pathStatus;
  } else if (view.scope === "projects") {
    switchTab("launcher"); state.projectSearch = view.query; document.querySelector("#projectSearch").value = state.projectSearch;
  } else if (view.scope === "notes") {
    switchTab("notes"); state.noteSearch = view.query; document.querySelector("#noteSearch").value = state.noteSearch;
  }
  renderAll();
}

export async function saveCurrentView() {
  const existing = state.savedViews.find((item) => item.id === state.activeViewId);
  const name = prompt("保存视图名称", existing?.name || "");
  if (!name?.trim()) return;
  const scope = state.activeTab === "launcher" ? "projects" : state.activeTab;
  const query = scope === "paths" ? state.pathSearch : scope === "projects" ? state.projectSearch : state.noteSearch;
  const item = {
    ...(existing ? { id: existing.id } : {}), name: name.trim(), scope, query,
    tagIds: scope === "paths" && state.pathCategory !== "all" ? [state.pathCategory] : [],
    pathStatus: scope === "paths" && ["available", "missing", "denied", "invalid"].includes(state.pathStatus) ? state.pathStatus : "any",
    sort: state.sortMode,
  };
  try {
    const result = await engineAction("dashboard.view.upsert", { expectedRevision: state.aggregateRevision, item });
    state.activeViewId = result.item.id;
    await afterWrite(existing ? "保存视图已更新" : "保存视图已添加", { result, patch: { type: "upsert", collection: "savedViews" } });
  } catch (error) { await handleWriteError(error, "保存视图失败"); }
}

export async function deleteCurrentView() {
  const view = state.savedViews.find((item) => item.id === state.activeViewId);
  if (!view) return;
  if (!(await requestConfirm({
    title: "删除保存视图",
    message: `删除保存视图“${view.name}”？`,
    confirmLabel: "删除",
    danger: true,
  }))) return;
  try {
    const result = await engineAction("dashboard.view.delete", { id: view.id, expectedRevision: state.aggregateRevision });
    await afterWrite("保存视图已删除", { result, patch: { type: "delete", collection: "savedViews", id: view.id } });
  } catch (error) { await handleWriteError(error, "删除视图失败"); }
}
