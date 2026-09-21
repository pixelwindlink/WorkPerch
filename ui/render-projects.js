import { state } from "./state.js";
import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, safeHttpUrl, showToast, withPreservedWindowScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, copyText, recordUsage, switchTab, LAUNCHER_UNAVAILABLE_GUIDANCE } from "./engine-client.js";
import { compareRecords, inspectionLabel } from "./render-shared.js";
import { openLocalPathInFinder } from "./desktop.js";
import { openProjectEditor, openProjectLaunchEditor, projectInput } from "./dialogs-project.js";
import { requestConfirm } from "./confirm.js";

export function launcherStatus(item) {
  const definition = state.launcherDefinitions.get(item.id);
  const run = state.launcherRuns.get(item.id);
  if (state.launcherAvailable === false) return { state: "unavailable", label: "不可用", definition, run };
  if (run?.status === "running") return { state: "running", label: `运行中 · ${run.pid}`, definition, run };
  if (run?.status === "failed") return { state: "failed", label: "启动失败", definition, run };
  if (run?.status === "stale") return { state: "stale", label: "状态过期", definition, run };
  if (run?.status === "stopped") return { state: "stopped", label: "已停止", definition, run };
  if (definition) return { state: "ready", label: "已配置", definition, run };
  return { state: "unconfigured", label: state.launcherAvailable === null ? "检查中" : "未配置", definition, run };
}

export function renderProjects() {
  withPreservedWindowScroll(() => {
    const query = normalize(state.projectSearch);
    const rows = [...state.projects]
      .filter((item) => {
        const typeMatches = state.projectFilter === "all" || item.type === state.projectFilter;
        const launch = launcherStatus(item);
        return typeMatches && (!query || normalize([item.name, item.description, item.path, item.port, item.label, ...tagNames(item), inspectionLabel(item), launch.label, launch.definition?.executable, ...(launch.definition?.args || [])].join(" ")).includes(query));
      })
      .sort((a, b) => compareRecords(a, b));
    elements.projectList.innerHTML = rows.map((item) => {
      const probe = state.probeResults.get(item.id);
      const endpoint = item.url || (item.port ? `http://127.0.0.1:${item.port}` : "");
      const endpointStatus = probe?.state || (endpoint ? "checking" : "invalid");
      const endpointLabel = endpoint ? (probe?.latencyMs !== undefined ? `${probe.state} · ${probe.latencyMs}ms` : item.port ? `:${item.port}` : "CHECK") : "LOCAL";
      const launch = launcherStatus(item);
      const webUrl = safeHttpUrl(item.url);
      const launchDisabled = !state.connected || state.launcherAvailable === false;
      return `
      <div class="kv-row project-row ${item.pinned ? "is-pinned" : ""} ${state.highlightProjectId === item.id ? "duplicate-hit" : ""}" data-id="${escapeHtml(item.id)}">
        <div class="kv-key"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.label)} · ${escapeHtml(item.description || "—")}</small><span class="tag-strip">${renderTagChips(item)}</span><small>${escapeHtml(inspectionLabel(item))}</small></div>
        <button class="kv-value" data-action="copy-project-path" type="button" title="点击复制路径">${escapeHtml(item.path)}</button>
        <div class="project-status-stack">
          <span class="status launch-status" data-state="${escapeHtml(launch.state)}" title="${escapeHtml(launch.definition ? `${launch.definition.executable} ${launch.definition.args.join(" ")}` : "尚未登记安全启动定义")}"><i></i>${escapeHtml(launch.label)}</span>
          <span class="status endpoint-status" data-state="${escapeHtml(endpointStatus)}" title="${escapeHtml(endpoint || "未配置 endpoint")}"><i></i>${escapeHtml(endpointLabel)}</span>
        </div>
        <div class="row-actions project-actions">
          ${launch.state === "running" ? `<button class="row-button danger" data-action="stop-project-launch" data-label="停止" type="button" ${launchDisabled ? "disabled" : ""}>${icon("stop")}</button>` : `<button class="row-button is-primary" data-action="start-project-launch" data-label="启动" type="button" ${launchDisabled || !launch.definition ? "disabled" : ""}>${icon("play")}</button>`}
          <button class="row-button" data-action="configure-project-launch" data-label="启动配置" data-long="true" type="button" ${launchDisabled ? "disabled" : ""}>${icon("settings")}</button>
          <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-project" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" ${state.connected ? "" : "disabled"}>${icon("pin")}</button>
          <button class="row-button" data-action="copy-project-path" data-label="复制路径" data-long="true" type="button">${icon("copy")}</button>
          ${webUrl ? `<a class="row-link" href="${escapeHtml(webUrl)}" target="_blank" rel="noopener" data-label="打开">${icon("external")}</a>` : `<button class="row-button" data-action="open-project-path-in-finder" data-label="目录" type="button" aria-label="在访达打开项目目录">${icon("folder")}</button>`}
          ${item.command ? `<button class="row-button" data-action="copy-project-command" data-label="复制命令" data-long="true" type="button">${icon("terminal")}</button>` : ""}
          <button class="row-button" data-action="inspect-project-path" data-label="检查" type="button">${icon("refresh")}</button>
          <button class="row-button" data-action="edit-project" data-label="编辑" type="button" ${state.connected ? "" : "disabled"}>${icon("edit")}</button>
          <button class="row-button danger" data-action="delete-project" data-label="删除" type="button" ${state.connected ? "" : "disabled"}>${icon("trash")}</button>
        </div>
      </div>`;
    }).join("");
    document.querySelector("#projectCount").textContent = String(state.projects.length);
    document.querySelector("#totalProjectCount").textContent = String(state.projects.length);
    document.querySelector("#visibleProjectCount").textContent = String(rows.length);
    elements.projectEmpty.hidden = rows.length > 0;
    const banner = document.querySelector("#launcherDependencyBanner");
    if (banner) {
      banner.hidden = state.launcherAvailable !== false;
      banner.textContent = LAUNCHER_UNAVAILABLE_GUIDANCE;
    }
  });
}

export async function handleProjectAction(event) {
  const action = event.target.closest("[data-action]");
  const row = action?.closest("[data-id]");
  const item = state.projects.find((candidate) => candidate.id === row?.dataset.id);
  if (!action || !item) return;
  if (action.dataset.action === "copy-project-path") return copyText(item.path, `${item.name} 路径`, { kind: "project", id: item.id });
  if (action.dataset.action === "open-project-path-in-finder") return openLocalPathInFinder(item.path, item.name, { kind: "project", id: item.id });
  if (action.dataset.action === "copy-project-command") return copyText(`cd ${item.path} && ${item.command}`, `${item.name} 启动命令`, { kind: "project", id: item.id });
  if (action.dataset.action === "configure-project-launch") return openProjectLaunchEditor(item);
  if (action.dataset.action === "start-project-launch") {
    try {
      const result = await engineAction("perch.project.launch.start", { projectId: item.id });
      state.launcherAvailable = true;
      state.launcherRuns.set(item.id, result.run);
      renderProjects();
      await recordUsage("project", item.id);
      showToast(`${item.name} 已启动 · PID ${result.run.pid}`);
    } catch (error) { await handleLauncherError(error, "启动项目失败"); }
    return;
  }
  if (action.dataset.action === "stop-project-launch") {
    try {
      const result = await engineAction("perch.project.launch.stop", { projectId: item.id });
      state.launcherAvailable = true;
      state.launcherRuns.set(item.id, result.run);
      renderProjects();
      await refreshLauncherStatuses({ silent: true });
      showToast(`${item.name} 已停止`);
    } catch (error) { await handleLauncherError(error, "停止项目失败"); }
    return;
  }
  if (action.dataset.action === "inspect-project-path") {
    try {
      const result = await engineAction("perch.path.inspect", { kind: "project", id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("项目路径状态已刷新", { result, patch: { type: "inspection", kind: "project", id: item.id } });
    } catch (error) { await handleWriteError(error, "项目路径检查失败"); }
    return;
  }
  if (action.dataset.action === "edit-project") return openProjectEditor(item);
  if (action.dataset.action === "pin-project") {
    try {
      const result = await engineAction("perch.project.upsert", { expectedRevision: state.aggregateRevision, item: projectInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "项目已置顶", { result, patch: { type: "upsert", collection: "projects" } });
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-project" && state.launcherRuns.get(item.id)?.status === "running") {
    showToast("请先停止 Launcher-owned 项目进程，再删除项目入口", 3200);
    return;
  }
  if (action.dataset.action === "delete-project") {
    if (!(await requestConfirm({
      title: "删除项目入口",
      message: `删除项目入口“${item.name}”？`,
      confirmLabel: "删除",
      danger: true,
    }))) return;
    try {
      const result = await engineAction("perch.project.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("项目入口已删除", { probe: true, result, patch: { type: "delete", collection: "projects" } });
    } catch (error) { await handleWriteError(error, "删除项目失败"); }
  }
}

export async function refreshProjectStatuses() {
  if (!state.connected || !state.projects.length) return;
  try {
    const payload = await engineAction("perch.project.probe", { timeoutMs: 1200 });
    state.probeResults = new Map(payload.results.map((item) => [item.projectId, item]));
    renderProjects();
  } catch (error) {
    state.probeResults = new Map();
    renderProjects();
    if (error.code !== "ENGINE_DISCONNECTED") showToast(`项目探测失败：${error.message}`, 2600);
  }
}

export async function refreshLauncherStatuses({ silent = false } = {}) {
  if (!state.connected) return false;
  try {
    const payload = await engineAction("perch.project.launch.status", { projectIds: state.projects.map((item) => item.id) });
    state.launcherAvailable = true;
    state.launcherRevision = payload.launcherRevision;
    state.launcherDefinitions = new Map(payload.definitions.map((item) => [item.projectId, item]));
    const latestRuns = new Map();
    payload.runs.forEach((run) => latestRuns.set(run.projectId, run));
    state.launcherRuns = latestRuns;
    renderProjects();
    return true;
  } catch (error) {
    if (error.code === "DEPENDENCY_UNAVAILABLE") {
      state.launcherAvailable = false;
      state.launcherDefinitions = new Map();
      state.launcherRuns = new Map();
      renderProjects();
      if (!silent) showToast(LAUNCHER_UNAVAILABLE_GUIDANCE, 4200);
      return false;
    }
    if (!silent) showToast(`Launcher 状态读取失败：${error.message}`, 3200);
    return false;
  }
}

export async function handleLauncherError(error, prefix) {
  if (error.code === "DEPENDENCY_UNAVAILABLE") {
    state.launcherAvailable = false;
    renderProjects();
    showToast(`${prefix}：${LAUNCHER_UNAVAILABLE_GUIDANCE}`, 4200);
    return;
  }
  if (error.code === "LAUNCHER_REVISION_CONFLICT") await refreshLauncherStatuses({ silent: true });
  showToast(`${prefix}：${error.message}`, 3600);
}

export function revealExistingProject(item, message = `已定位项目：${item.name}`) {
  switchTab("launcher");
  state.projectSearch = "";
  state.projectFilter = "all";
  state.highlightProjectId = item.id;
  document.querySelector("#projectSearch").value = "";
  document.querySelectorAll("#projectFilters button").forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "all"));
  renderProjects();
  requestAnimationFrame(() => elements.projectList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  setTimeout(() => {
    elements.projectList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.remove("duplicate-hit");
    if (state.highlightProjectId === item.id) state.highlightProjectId = null;
  }, 1450);
  if (message) showToast(message);
}
