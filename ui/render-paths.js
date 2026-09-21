import { state } from "./state.js";
import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, showToast, withPreservedWindowScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, copyText, switchTab } from "./engine-client.js";
import { compareRecords, inspectionLabel } from "./render-shared.js";
import { openLocalPathInFinder } from "./desktop.js";
import { openPathEditor, pathInput } from "./dialogs-path.js";
import { openProjectEditor } from "./dialogs-project.js";
import { requestConfirm } from "./confirm.js";
import { isAbnormalInspectionStatus } from "./path-status.js";
import { bindUsageHomeScroll } from "./usage-home.js";

function parentDirectory(filePath) {
  const normalized = String(filePath || "").replace(/\/+$/, "");
  if (!normalized.startsWith("/")) return "";
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "/";
  return normalized.slice(0, index) || "/";
}

export function findProjectForPath(filePath) {
  const target = comparablePath(filePath);
  return target ? state.projects.find((item) => comparablePath(item.path) === target) : null;
}

function pathStatusMatches(item) {
  const status = item.inspection?.status || "unchecked";
  if (state.pathStatus === "any") return true;
  if (state.pathStatus === "abnormal") return isAbnormalInspectionStatus(status);
  return status === state.pathStatus;
}

function filteredPaths() {
  const query = normalize(state.pathSearch);
  return [...state.paths]
    .filter((item) => {
      const groupMatches = state.pathCategory === "all" || item.tagIds.includes(state.pathCategory);
      return groupMatches && pathStatusMatches(item) && (!query || normalize([item.name, item.path, ...tagNames(item), item.description, inspectionLabel(item)].join(" ")).includes(query));
    })
    .sort((a, b) => compareRecords(a, b));
}

function renderUsageHome() {
  const home = document.querySelector("#usageHome");
  if (!home) return;
  const limit = state.minimalMode ? 36 : 8;
  const recent = [...state.paths]
    .filter((item) => item.usage?.lastUsedAt)
    .sort((a, b) => Date.parse(b.usage.lastUsedAt) - Date.parse(a.usage.lastUsedAt) || a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, limit);
  const frequent = [...state.paths]
    .filter((item) => (item.usage?.count || 0) > 0)
    .sort((a, b) => (b.usage.count || 0) - (a.usage.count || 0) || Date.parse(b.usage?.lastUsedAt || 0) - Date.parse(a.usage?.lastUsedAt || 0) || a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, limit);
  const recentProjects = [...state.projects]
    .filter((item) => item.usage?.lastUsedAt)
    .sort((a, b) => Date.parse(b.usage.lastUsedAt) - Date.parse(a.usage.lastUsedAt) || a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, limit);
  if (!recent.length && !frequent.length && !recentProjects.length) {
    if (state.minimalMode) {
      home.hidden = false;
      home.innerHTML = `<div class="usage-home-heading"><strong>最近入口</strong></div><div class="usage-home-empty">还没有使用记录。退出极简模式后，打开或复制路径即可出现在这里。</div>`;
      bindUsageHomeScroll(home);
      return;
    }
    home.hidden = true;
    home.innerHTML = "";
    return;
  }
  const section = (title, items, kind, action) => {
    if (!items.length) return "";
    return `<div class="usage-home-section" data-kind="${kind}"><span class="usage-home-label">${title}</span><div class="usage-home-chips" tabindex="0">${items.map((item) => `<button class="usage-chip" type="button" data-action="${action}" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.path)}">${escapeHtml(item.name)}</button>`).join("")}</div></div>`;
  };
  home.hidden = false;
  home.innerHTML = [
    `<div class="usage-home-heading"><strong>最近入口</strong>${state.minimalMode ? "" : "<span>优先打开常用路径与项目</span>"}</div>`,
    section("最近路径", recent, "recent", "reveal-usage-path"),
    section("常用路径", frequent, "frequent", "reveal-usage-path"),
    section("最近项目", recentProjects, "recent-projects", "reveal-usage-project"),
  ].join("");
  bindUsageHomeScroll(home);
}

function syncAbnormalToolbar() {
  const abnormalCount = state.paths.filter((item) => isAbnormalInspectionStatus(item.inspection?.status)).length;
  const filterButton = document.querySelector("#abnormalPathsButton");
  const cleanupButton = document.querySelector("#cleanupAbnormalPathsButton");
  if (filterButton) {
    filterButton.classList.toggle("is-active", state.pathStatus === "abnormal");
    filterButton.setAttribute("aria-pressed", String(state.pathStatus === "abnormal"));
    filterButton.querySelector("b").textContent = String(abnormalCount);
  }
  if (cleanupButton) {
    cleanupButton.hidden = state.pathStatus !== "abnormal" || abnormalCount === 0;
  }
}

export function renderPathGroups() {
  const groups = [...state.tags].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const select = document.querySelector("#pathCategory");
  const current = state.pathCategory;
  select.innerHTML = '<option value="all">全部标签</option>' + groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
  select.value = groups.some((group) => group.id === current) ? current : "all";
  state.pathCategory = select.value;
  document.querySelector("#pathGroups").innerHTML = groups.map((group) => `<option value="${escapeHtml(group.name)}"></option>`).join("");
  document.querySelector("#groupCount").textContent = String(groups.length);
}

export function renderPaths({ resetScroll = false } = {}) {
  const paint = () => {
    const rows = filteredPaths();
    elements.pathList.innerHTML = rows.map((item) => {
      const status = item.inspection?.status || "unchecked";
      const abnormal = isAbnormalInspectionStatus(status);
      const projectHit = findProjectForPath(item.path);
      return `
    <div class="kv-row path-row ${item.pinned ? "is-pinned" : ""} ${state.highlightPathId === item.id ? "duplicate-hit" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="path-identity">
        <strong class="path-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
        <span class="tag-strip">${renderTagChips(item)}</span>
        <span class="path-note" title="${escapeHtml(item.description || "暂无备注")}">${escapeHtml(item.description || "暂无备注")}</span>
        <span class="path-inspection" data-state="${escapeHtml(status)}">${escapeHtml(inspectionLabel(item))}</span>
        ${projectHit ? `<button class="path-project-hint" data-action="reveal-linked-project" data-project-id="${escapeHtml(projectHit.id)}" type="button" title="已登记为项目入口：${escapeHtml(projectHit.name)}">已是项目 · ${escapeHtml(projectHit.name)}</button>` : ""}
      </div>
      <button class="kv-value" data-action="copy-path" type="button" title="点击复制：${escapeHtml(item.path)}">${escapeHtml(item.path)}</button>
      <div class="row-actions">
        <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-path" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" aria-label="${item.pinned ? "取消置顶" : "置顶"}" ${state.connected ? "" : "disabled"}>${icon("pin")}</button>
        <button class="row-button" data-action="copy-path" data-label="复制" type="button" aria-label="复制路径">${icon("copy")}</button>
        <button class="row-button" data-action="open-path-in-finder" data-label="打开" type="button" aria-label="在访达打开路径">${icon("external")}</button>
        ${abnormal ? `<button class="row-button" data-action="open-path-parent" data-label="父目录" type="button" aria-label="在访达打开父目录">${icon("folder")}</button>` : ""}
        <button class="row-button" data-action="inspect-path" data-label="检查" type="button" aria-label="检查路径状态">${icon("refresh")}</button>
        ${abnormal ? `<button class="row-button" data-action="repair-path" data-label="修复" type="button" aria-label="修复路径">${icon("edit")}</button>` : ""}
        <button class="row-button" data-action="promote-path" data-label="升为项目" data-long="true" type="button" aria-label="升为项目入口" ${state.connected ? "" : "disabled"}>${icon("play")}</button>
        <button class="row-button" data-action="edit-path" data-label="编辑" type="button" aria-label="编辑" ${state.connected ? "" : "disabled"}>${icon("edit")}</button>
        <button class="row-button danger" data-action="delete-path" data-label="删除" type="button" aria-label="删除" ${state.connected ? "" : "disabled"}>${icon("trash")}</button>
      </div>
    </div>`;
    }).join("");
    document.querySelector("#pathCount").textContent = String(state.paths.length);
    document.querySelector("#totalPathCount").textContent = String(state.paths.length);
    document.querySelector("#visiblePathCount").textContent = String(rows.length);
    elements.pathEmpty.hidden = rows.length > 0;
    renderUsageHome();
    syncAbnormalToolbar();
  };
  if (resetScroll) {
    paint();
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    requestAnimationFrame(() => {
      toTop();
      requestAnimationFrame(toTop);
    });
    return;
  }
  withPreservedWindowScroll(paint);
}

export function setAbnormalPathFilter(enabled = true) {
  state.pathStatus = enabled ? "abnormal" : "any";
  const select = document.querySelector("#pathStatusFilter");
  if (select) select.value = state.pathStatus;
  renderPaths({ resetScroll: true });
}

export async function refreshAllPathStatuses({ silent = false } = {}) {
  if (!state.connected) {
    if (!silent) showToast("WorkPerch 未连接");
    return;
  }
  const button = document.querySelector("#refreshAllPathsButton");
  if (button) button.disabled = true;
  try {
    const result = await engineAction("perch.path.refresh-all", { expectedRevision: state.aggregateRevision });
    const abnormal = (result.summary?.missing || 0) + (result.summary?.denied || 0) + (result.summary?.invalid || 0);
    const message = abnormal > 0
      ? `已检查 ${result.summary.total} 条：有效 ${result.summary.available}，异常 ${abnormal}`
      : `已检查 ${result.summary.total} 条路径，全部有效`;
    await afterWrite(message, { result, patch: { type: "inspections", kind: "path" } });
  } catch (error) {
    await handleWriteError(error, "全量检查失败");
  } finally {
    if (button) button.disabled = false;
  }
}

export async function batchDeleteAbnormalPaths() {
  if (!state.connected) return showToast("请先连接 WorkPerch Server");
  const targets = filteredPaths().filter((item) => isAbnormalInspectionStatus(item.inspection?.status));
  if (!targets.length) return showToast("当前没有可清理的异常路径");
  if (!(await requestConfirm({
    title: "清理异常路径",
    message: `删除当前可见的 ${targets.length} 条异常路径？此操作不可撤销。`,
    confirmLabel: "全部删除",
    danger: true,
  }))) return;
  let deleted = 0;
  for (const item of targets) {
    try {
      const result = await engineAction("perch.path.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      state.aggregateRevision = result.aggregateRevision;
      state.paths = state.paths.filter((candidate) => candidate.id !== item.id);
      deleted += 1;
    } catch (error) {
      await handleWriteError(error, `清理中断（已删除 ${deleted} 条）`);
      renderPaths();
      return;
    }
  }
  renderPaths({ resetScroll: true });
  showToast(`已清理 ${deleted} 条异常路径`);
}

export async function handlePathAction(event) {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "reveal-usage-path") {
    const item = state.paths.find((candidate) => candidate.id === action.dataset.id);
    if (!item) return;
    if (state.minimalMode) {
      await openLocalPathInFinder(item.path, item.name, { kind: "path", id: item.id });
      return;
    }
    revealExistingPath(item, `已定位：${item.name}`);
    return;
  }
  if (action.dataset.action === "reveal-usage-project") {
    const project = state.projects.find((candidate) => candidate.id === action.dataset.id);
    if (!project) return showToast("未找到对应项目入口");
    if (state.minimalMode) {
      await openLocalPathInFinder(project.path, project.name, { kind: "project", id: project.id });
      return;
    }
    const { revealExistingProject } = await import("./render-projects.js");
    revealExistingProject(project);
    return;
  }
  const row = action.closest("[data-id]");
  const item = state.paths.find((candidate) => candidate.id === row?.dataset.id);
  if (!item && action.dataset.action !== "reveal-linked-project") return;

  if (action.dataset.action === "reveal-linked-project") {
    const project = state.projects.find((candidate) => candidate.id === action.dataset.projectId);
    if (!project) return showToast("未找到对应项目入口");
    const { revealExistingProject } = await import("./render-projects.js");
    revealExistingProject(project);
    return;
  }
  if (action.dataset.action === "copy-path") return copyText(item.path, item.name, { kind: "path", id: item.id });
  if (action.dataset.action === "open-path-in-finder") return openLocalPathInFinder(item.path, item.name, { kind: "path", id: item.id });
  if (action.dataset.action === "open-path-parent") {
    const parent = parentDirectory(item.path);
    if (!parent) return showToast("无法解析父目录");
    return openLocalPathInFinder(parent, `${item.name} 父目录`);
  }
  if (action.dataset.action === "inspect-path") {
    try {
      const result = await engineAction("perch.path.inspect", { kind: "path", id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("路径状态已刷新", { result, patch: { type: "inspection", kind: "path", id: item.id } });
    } catch (error) { await handleWriteError(error, "路径检查失败"); }
    return;
  }
  if (action.dataset.action === "repair-path") {
    const nextPath = prompt(`输入“${item.name}”的新绝对路径`, item.path);
    if (!nextPath || nextPath === item.path) return;
    try {
      const result = await engineAction("perch.path.repair", { id: item.id, path: nextPath.trim(), expectedRevision: state.aggregateRevision });
      await afterWrite("路径已修复", { result, patch: { type: "upsert", collection: "paths" } });
    } catch (error) { await handleWriteError(error, "路径修复失败"); }
    return;
  }
  if (action.dataset.action === "promote-path") {
    openProjectEditor({
      name: item.name,
      path: item.path,
      tagIds: item.tagIds,
      description: item.description || "",
      type: "other",
      label: "Other",
      url: "",
      port: 0,
      command: "",
      pinned: false,
    });
    return;
  }
  if (action.dataset.action === "edit-path") return openPathEditor(item);
  if (action.dataset.action === "pin-path") {
    try {
      const result = await engineAction("perch.path.upsert", { expectedRevision: state.aggregateRevision, item: pathInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "路径已置顶", { result, patch: { type: "upsert", collection: "paths" } });
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-path") {
    if (!(await requestConfirm({
      title: "删除路径",
      message: `删除“${item.name}”？`,
      confirmLabel: "删除",
      danger: true,
    }))) return;
    try {
      const result = await engineAction("perch.path.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("路径已删除", { result, patch: { type: "delete", collection: "paths" } });
    } catch (error) { await handleWriteError(error, "删除路径失败"); }
  }
}

export function comparablePath(value) {
  let filePath = String(value || "").trim();
  if (!filePath) return "";
  if (/^file:\/\//i.test(filePath)) {
    try {
      const url = new URL(filePath);
      if (url.protocol === "file:") filePath = decodeURIComponent(url.pathname);
    } catch {
      return "";
    }
  }
  filePath = filePath.replace(/\/{2,}/g, "/");
  if (filePath.length > 1) filePath = filePath.replace(/\/+$/, "");
  return filePath.normalize("NFC").toLocaleLowerCase("zh-CN");
}

export function normalizeDroppedPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^file:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "file:" || url.pathname.startsWith("/.file/id=")) return "";
      return decodeURIComponent(url.pathname);
    } catch {
      return "";
    }
  }
  return raw.startsWith("/") ? raw : "";
}

export function pathName(filePath) {
  const parts = String(filePath || "").replace(/\/+$/, "").split("/").filter(Boolean);
  return parts.at(-1) || "未命名路径";
}

export function findExistingPath(filePath) {
  const target = comparablePath(filePath);
  return target ? state.paths.find((item) => comparablePath(item.path) === target) : null;
}

export function revealExistingPath(item, message = `已收录：${item.name}`) {
  switchTab("paths");
  state.pathSearch = "";
  state.pathCategory = "all";
  state.pathStatus = "any";
  state.highlightPathId = item.id;
  document.querySelector("#pathSearch").value = "";
  document.querySelector("#pathCategory").value = "all";
  document.querySelector("#pathStatusFilter").value = "any";
  renderPaths();
  requestAnimationFrame(() => elements.pathList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  setTimeout(() => {
    elements.pathList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.remove("duplicate-hit");
    if (state.highlightPathId === item.id) state.highlightPathId = null;
  }, 1450);
  if (message) showToast(message);
}
