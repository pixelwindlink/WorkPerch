const STORAGE_KEYS = {
  paths: "local-dashboard.paths.v1",
  notes: "local-dashboard.notes.v1",
  theme: "local-dashboard.theme.v1",
  migration: "local-dashboard.engine-migration.v1",
};

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.4A8 8 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pin: '<path d="m9 4 6 2-1 4 3 3-4 1-3 7-1-7-4-2 4-3V4Z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2h7.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z"/>',
};

class EngineClientError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EngineClientError";
    this.code = code;
  }
}

const state = {
  connected: false,
  connecting: true,
  activeTab: "paths",
  aggregateRevision: 0,
  pathSearch: "",
  pathCategory: "all",
  projectSearch: "",
  projectFilter: "all",
  noteSearch: "",
  dropQueue: [],
  pathDialogFromDrop: false,
  highlightPathId: null,
  paths: [],
  notes: [],
  projects: [],
  probeResults: new Map(),
  legacyChecked: false,
};

const elements = {
  tabs: [...document.querySelectorAll(".tab")],
  panels: [...document.querySelectorAll(".panel")],
  workspace: document.querySelector(".workspace"),
  pathList: document.querySelector("#pathList"),
  pathEmpty: document.querySelector("#pathEmpty"),
  projectList: document.querySelector("#projectList"),
  projectEmpty: document.querySelector("#projectEmpty"),
  noteList: document.querySelector("#noteList"),
  noteEmpty: document.querySelector("#noteEmpty"),
  editPathDialog: document.querySelector("#editPathDialog"),
  editNoteDialog: document.querySelector("#editNoteDialog"),
  editProjectDialog: document.querySelector("#editProjectDialog"),
  legacyDialog: document.querySelector("#legacyMigrationDialog"),
  dropOverlay: document.querySelector("#dropOverlay"),
  toast: document.querySelector("#toast"),
  connectionBanner: document.querySelector("#connectionBanner"),
};

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Browser preference storage is best-effort. */ }
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* Explicit cleanup remains best-effort. */ }
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value = "") {
  return String(value).trim().toLocaleLowerCase("zh-CN");
}

function messageId() {
  return `dashboard-ui-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`.slice(0, 128);
}

function fileUrl(filePath) {
  return `file://${encodeURI(filePath)}`;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function showToast(message, duration = 1900) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), duration);
}

function copyText(text, label = "VALUE") {
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
  operation.then(() => showToast(`${label} 已复制`)).catch(() => {
    fallback();
    showToast(`${label} 已复制`);
  });
}

function switchTab(name, updateHash = true) {
  const tab = ["paths", "launcher", "notes"].includes(name) ? name : "paths";
  state.activeTab = tab;
  elements.tabs.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === tab));
  elements.panels.forEach((item) => item.classList.toggle("is-active", item.dataset.panel === tab));
  if (updateHash) history.replaceState(null, "", `#${tab}`);
}

function setConnectionStatus(kind, title, message) {
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

async function engineAction(action, payload = {}) {
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

async function loadSnapshot({ silent = false, probe = true } = {}) {
  if (!silent) setConnectionStatus("connecting", "正在连接 Dashboard Engine…", "正在读取 Engine-owned workspace snapshot。");
  try {
    const snapshot = await engineAction("dashboard.snapshot.get", {});
    state.aggregateRevision = snapshot.aggregateRevision;
    state.paths = snapshot.paths || [];
    state.notes = snapshot.notes || [];
    state.projects = snapshot.projects || [];
    setConnectionStatus("connected", "已连接", `revision ${state.aggregateRevision}`);
    renderAll();
    inspectLegacyData();
    if (probe) refreshProjectStatuses();
    return true;
  } catch (error) {
    setConnectionStatus("error", "Dashboard Engine 未连接", error.message || "请通过 npm start 启动 Server，然后重试。");
    renderAll();
    if (!silent) showToast("当前为只读连接失败状态", 2600);
    return false;
  }
}

async function afterWrite(message, { probe = false } = {}) {
  await loadSnapshot({ silent: true, probe });
  showToast(message);
}

async function handleWriteError(error, preservedMessage = "操作失败") {
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

function comparablePath(value) {
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

function normalizeDroppedPath(value) {
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

function pathName(filePath) {
  const parts = String(filePath || "").replace(/\/+$/, "").split("/").filter(Boolean);
  return parts.at(-1) || "未命名路径";
}

function findExistingPath(filePath) {
  const target = comparablePath(filePath);
  return target ? state.paths.find((item) => comparablePath(item.path) === target) : null;
}

function extractDroppedCandidates(dataTransfer) {
  const itemMetadata = Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => {
      const entry = item.webkitGetAsEntry?.();
      const file = item.getAsFile?.();
      return { name: entry?.name || file?.name || "", isDirectory: Boolean(entry?.isDirectory), directPath: normalizeDroppedPath(file?.path || "") };
    });
  const textPaths = [];
  for (const type of ["text/uri-list", "text/plain"]) {
    let text = "";
    try { text = dataTransfer.getData(type); } catch { text = ""; }
    text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).forEach((line) => {
      const filePath = normalizeDroppedPath(line);
      if (filePath) textPaths.push(filePath);
    });
  }
  const candidates = [];
  const knownPaths = [...textPaths, ...itemMetadata.map((item) => item.directPath).filter(Boolean)];
  for (const filePath of knownPaths) {
    const name = pathName(filePath);
    const metadata = itemMetadata.find((item) => item.name === name);
    candidates.push({ name, path: filePath, isDirectory: Boolean(metadata?.isDirectory) || filePath.endsWith("/") });
  }
  if (!knownPaths.length) itemMetadata.forEach((item) => candidates.push({ name: item.name || "未命名文件", path: "", isDirectory: item.isDirectory }));
  const seen = new Set();
  return candidates.filter((item) => {
    const key = item.path ? comparablePath(item.path) : `name:${item.name}:${item.isDirectory}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function revealExistingPath(item, message = `已收录：${item.name}`) {
  switchTab("paths");
  state.pathSearch = "";
  state.pathCategory = "all";
  state.highlightPathId = item.id;
  document.querySelector("#pathSearch").value = "";
  document.querySelector("#pathCategory").value = "all";
  renderPaths();
  requestAnimationFrame(() => elements.pathList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  setTimeout(() => {
    elements.pathList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.remove("duplicate-hit");
    if (state.highlightPathId === item.id) state.highlightPathId = null;
  }, 1450);
  showToast(message);
}

function processNextDroppedCandidate() {
  while (state.dropQueue.length) {
    const candidate = state.dropQueue.shift();
    const existing = candidate.path ? findExistingPath(candidate.path) : null;
    if (existing) {
      revealExistingPath(existing);
      continue;
    }
    openPathEditor({ name: candidate.name || pathName(candidate.path), path: candidate.path, group: candidate.isDirectory ? "文件夹" : "文件", description: "" }, {
      fromDrop: true,
      notice: candidate.path ? "已从拖放内容中识别到绝对路径，请确认后添加。" : "当前浏览器没有提供绝对路径。文件名已识别，请补充完整路径后添加。",
    });
    return;
  }
}

function handleDrop(event) {
  event.preventDefault();
  document.body.classList.remove("is-dragging");
  if (!state.connected) {
    showToast("请先连接 Dashboard Engine Server");
    return;
  }
  switchTab("paths");
  const candidates = extractDroppedCandidates(event.dataTransfer);
  if (!candidates.length) {
    showToast("没有识别到可收录的文件或文件夹");
    return;
  }
  const duplicates = [];
  const additions = [];
  candidates.forEach((candidate) => {
    const existing = candidate.path ? findExistingPath(candidate.path) : null;
    if (existing) duplicates.push(existing); else additions.push(candidate);
  });
  if (duplicates.length) revealExistingPath(duplicates[0], duplicates.length === 1 ? `已收录：${duplicates[0].name}` : `${duplicates.length} 个路径已经收录`);
  state.dropQueue = additions;
  if (additions.length) processNextDroppedCandidate();
}

function renderPathGroups() {
  const groups = [...new Set(state.paths.map((item) => item.group || "未分组"))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const select = document.querySelector("#pathCategory");
  const current = state.pathCategory;
  select.innerHTML = '<option value="all">全部分组</option>' + groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("");
  select.value = groups.includes(current) ? current : "all";
  state.pathCategory = select.value;
  document.querySelector("#pathGroups").innerHTML = groups.map((group) => `<option value="${escapeHtml(group)}"></option>`).join("");
}

function renderPaths() {
  const query = normalize(state.pathSearch);
  const rows = [...state.paths]
    .filter((item) => {
      const groupMatches = state.pathCategory === "all" || (item.group || "未分组") === state.pathCategory;
      return groupMatches && (!query || normalize([item.name, item.path, item.group, item.description].join(" ")).includes(query));
    })
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.name.localeCompare(b.name, "zh-CN"));
  elements.pathList.innerHTML = rows.map((item) => `
    <div class="kv-row path-row ${item.pinned ? "is-pinned" : ""} ${state.highlightPathId === item.id ? "duplicate-hit" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="kv-key"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${item.pinned ? "PINNED · " : ""}KEY</small></div>
      <button class="kv-value" data-action="copy-path" type="button" title="点击复制：${escapeHtml(item.path)}">${escapeHtml(item.path)}</button>
      <div class="kv-meta"><span class="group-tag">${escapeHtml(item.group || "未分组")}</span>${escapeHtml(item.description || "—")}</div>
      <div class="row-actions">
        <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-path" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" aria-label="${item.pinned ? "取消置顶" : "置顶"}" ${state.connected ? "" : "disabled"}>${icon("pin")}</button>
        <button class="row-button" data-action="copy-path" data-label="复制" type="button" aria-label="复制路径">${icon("copy")}</button>
        <a class="row-link" href="${escapeHtml(fileUrl(item.path))}" data-label="打开" aria-label="打开路径">${icon("external")}</a>
        <button class="row-button" data-action="edit-path" data-label="编辑" type="button" aria-label="编辑" ${state.connected ? "" : "disabled"}>${icon("edit")}</button>
        <button class="row-button danger" data-action="delete-path" data-label="删除" type="button" aria-label="删除" ${state.connected ? "" : "disabled"}>${icon("trash")}</button>
      </div>
    </div>`).join("");
  document.querySelector("#pathCount").textContent = String(state.paths.length);
  document.querySelector("#totalPathCount").textContent = String(state.paths.length);
  document.querySelector("#visiblePathCount").textContent = String(rows.length);
  elements.pathEmpty.hidden = rows.length > 0;
}

function renderProjects() {
  const query = normalize(state.projectSearch);
  const rows = [...state.projects]
    .filter((item) => {
      const typeMatches = state.projectFilter === "all" || item.type === state.projectFilter;
      return typeMatches && (!query || normalize([item.name, item.description, item.path, item.port, item.label, ...item.tags].join(" ")).includes(query));
    })
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.name.localeCompare(b.name, "zh-CN"));
  elements.projectList.innerHTML = rows.map((item) => {
    const probe = state.probeResults.get(item.id);
    const endpoint = item.url || (item.port ? `http://127.0.0.1:${item.port}` : "");
    const status = probe?.state || (endpoint ? "checking" : "invalid");
    const webUrl = safeHttpUrl(item.url);
    return `
      <div class="kv-row project-row ${item.pinned ? "is-pinned" : ""}" data-id="${escapeHtml(item.id)}">
        <div class="kv-key"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.label)} · ${escapeHtml(item.description || "—")}</small></div>
        <button class="kv-value" data-action="copy-project-path" type="button" title="点击复制路径">${escapeHtml(item.path)}</button>
        <span class="status" data-state="${escapeHtml(status)}" title="${escapeHtml(endpoint || "未配置 endpoint")}"><i></i>${endpoint ? escapeHtml(probe?.latencyMs !== undefined ? `${probe.state} · ${probe.latencyMs}ms` : item.port ? `:${item.port}` : "CHECK") : "LOCAL"}</span>
        <div class="row-actions project-actions">
          <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-project" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" ${state.connected ? "" : "disabled"}>${icon("pin")}</button>
          <button class="row-button" data-action="copy-project-path" data-label="复制路径" data-long="true" type="button">${icon("copy")}</button>
          ${webUrl ? `<a class="row-link" href="${escapeHtml(webUrl)}" target="_blank" rel="noopener" data-label="打开">${icon("external")}</a>` : `<a class="row-link" href="${escapeHtml(fileUrl(item.path))}" data-label="目录">${icon("folder")}</a>`}
          ${item.command ? `<button class="row-button" data-action="copy-project-command" data-label="复制命令" data-long="true" type="button">${icon("terminal")}</button>` : ""}
          <button class="row-button" data-action="edit-project" data-label="编辑" type="button" ${state.connected ? "" : "disabled"}>${icon("edit")}</button>
          <button class="row-button danger" data-action="delete-project" data-label="删除" type="button" ${state.connected ? "" : "disabled"}>${icon("trash")}</button>
        </div>
      </div>`;
  }).join("");
  document.querySelector("#projectCount").textContent = String(state.projects.length);
  document.querySelector("#totalProjectCount").textContent = String(state.projects.length);
  document.querySelector("#visibleProjectCount").textContent = String(rows.length);
  elements.projectEmpty.hidden = rows.length > 0;
}

function renderNotes() {
  const query = normalize(state.noteSearch);
  const rows = [...state.notes]
    .filter((item) => !query || normalize([item.title, item.content].join(" ")).includes(query))
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt) - new Date(a.updatedAt));
  elements.noteList.innerHTML = rows.map((item) => `
    <div class="kv-row note-row ${item.pinned ? "is-pinned" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="kv-key"><strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong><small>${item.pinned ? "PINNED · " : ""}KEY</small></div>
      <button class="kv-value" data-action="copy-note" type="button" title="点击复制内容">${escapeHtml(item.content)}</button>
      <div class="kv-meta">${formatDate(item.updatedAt)}</div>
      <div class="row-actions">
        <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-note" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" ${state.connected ? "" : "disabled"}>${icon("pin")}</button>
        <button class="row-button" data-action="copy-note" data-label="复制" type="button">${icon("copy")}</button>
        <button class="row-button" data-action="edit-note" data-label="编辑" type="button" ${state.connected ? "" : "disabled"}>${icon("edit")}</button>
        <button class="row-button danger" data-action="delete-note" data-label="删除" type="button" ${state.connected ? "" : "disabled"}>${icon("trash")}</button>
      </div>
    </div>`).join("");
  document.querySelector("#noteCount").textContent = String(state.notes.length);
  document.querySelector("#totalNoteCount").textContent = String(state.notes.length);
  document.querySelector("#visibleNoteCount").textContent = String(rows.length);
  elements.noteEmpty.hidden = rows.length > 0;
}

function renderAll() {
  renderPathGroups();
  renderPaths();
  renderProjects();
  renderNotes();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function pathInput(item, changes = {}) {
  return { id: item.id, name: item.name, path: item.path, group: item.group, description: item.description, pinned: item.pinned, ...changes };
}

function noteInput(item, changes = {}) {
  return { id: item.id, title: item.title, content: item.content, pinned: item.pinned, ...changes };
}

function projectInput(item, changes = {}) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    label: item.label,
    description: item.description,
    path: item.path,
    url: item.url,
    port: item.port,
    command: item.command,
    tags: item.tags,
    pinned: item.pinned,
    ...changes,
  };
}

function openPathEditor(item = null, options = {}) {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  const editing = Boolean(item?.id);
  state.pathDialogFromDrop = Boolean(options.fromDrop);
  document.querySelector("#pathDialogKicker").textContent = editing ? "EDIT PAIR" : "ADD PAIR";
  document.querySelector("#pathDialogTitle").textContent = editing ? "编辑文件路径" : "添加文件路径";
  document.querySelector("#pathDialogSubmit").textContent = editing ? "保存修改" : "添加路径";
  const notice = document.querySelector("#pathDialogNotice");
  notice.textContent = options.notice || "";
  notice.hidden = !options.notice;
  document.querySelector("#editPathId").value = item?.id || "";
  document.querySelector("#editPathKey").value = item?.name || "";
  document.querySelector("#editPathValue").value = item?.path || "";
  document.querySelector("#editPathGroup").value = item?.group || "";
  document.querySelector("#editPathNote").value = item?.description || "";
  elements.editPathDialog.showModal();
  setTimeout(() => document.querySelector("#editPathKey").focus(), 0);
}

async function savePathEdit() {
  const id = document.querySelector("#editPathId").value;
  const existing = state.paths.find((item) => item.id === id);
  const item = {
    ...(id ? { id } : {}),
    name: document.querySelector("#editPathKey").value.trim(),
    path: document.querySelector("#editPathValue").value.trim(),
    group: document.querySelector("#editPathGroup").value.trim() || "未分组",
    description: document.querySelector("#editPathNote").value.trim(),
    pinned: existing?.pinned || false,
  };
  try {
    await engineAction("dashboard.path.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "路径已更新" : "路径已添加");
    return true;
  } catch (error) {
    if (error.code === "DASHBOARD_PATH_ALREADY_EXISTS") {
      await loadSnapshot({ silent: true, probe: false });
      const duplicate = findExistingPath(item.path);
      if (duplicate) {
        elements.editPathDialog.close();
        revealExistingPath(duplicate, `已经收录：${duplicate.name}`);
        return false;
      }
    }
    await handleWriteError(error, "保存路径失败");
    return false;
  }
}

function openNoteEditor(item = null) {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  const editing = Boolean(item?.id);
  document.querySelector("#noteDialogKicker").textContent = editing ? "EDIT PAIR" : "ADD PAIR";
  document.querySelector("#noteDialogTitle").textContent = editing ? "编辑速记" : "添加速记";
  document.querySelector("#noteDialogSubmit").textContent = editing ? "保存修改" : "添加速记";
  document.querySelector("#editNoteId").value = item?.id || "";
  document.querySelector("#editNoteKey").value = item?.title || "";
  document.querySelector("#editNoteValue").value = item?.content || "";
  elements.editNoteDialog.showModal();
  setTimeout(() => document.querySelector("#editNoteKey").focus(), 0);
}

async function saveNoteEdit() {
  const id = document.querySelector("#editNoteId").value;
  const existing = state.notes.find((item) => item.id === id);
  const item = {
    ...(id ? { id } : {}),
    title: document.querySelector("#editNoteKey").value.trim(),
    content: document.querySelector("#editNoteValue").value.trim(),
    pinned: existing?.pinned || false,
  };
  try {
    await engineAction("dashboard.note.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "速记已更新" : "速记已添加");
    return true;
  } catch (error) {
    await handleWriteError(error, "保存速记失败");
    return false;
  }
}

function openProjectEditor(item = null) {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  const editing = Boolean(item?.id);
  document.querySelector("#projectDialogKicker").textContent = editing ? "EDIT ENTRY" : "ADD ENTRY";
  document.querySelector("#projectDialogTitle").textContent = editing ? "编辑项目入口" : "添加项目入口";
  document.querySelector("#projectDialogSubmit").textContent = editing ? "保存修改" : "添加项目";
  document.querySelector("#editProjectId").value = item?.id || "";
  document.querySelector("#editProjectName").value = item?.name || "";
  document.querySelector("#editProjectType").value = item?.type || "other";
  document.querySelector("#editProjectPath").value = item?.path || "";
  document.querySelector("#editProjectUrl").value = item?.url || "";
  document.querySelector("#editProjectPort").value = String(item?.port || 0);
  document.querySelector("#editProjectCommand").value = item?.command || "";
  document.querySelector("#editProjectLabel").value = item?.label || "Other";
  document.querySelector("#editProjectTags").value = (item?.tags || []).join(", ");
  document.querySelector("#editProjectDescription").value = item?.description || "";
  elements.editProjectDialog.showModal();
  setTimeout(() => document.querySelector("#editProjectName").focus(), 0);
}

async function saveProjectEdit() {
  const id = document.querySelector("#editProjectId").value;
  const existing = state.projects.find((item) => item.id === id);
  const tags = document.querySelector("#editProjectTags").value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  const item = {
    ...(id ? { id } : {}),
    name: document.querySelector("#editProjectName").value.trim(),
    type: document.querySelector("#editProjectType").value,
    label: document.querySelector("#editProjectLabel").value.trim(),
    description: document.querySelector("#editProjectDescription").value.trim(),
    path: document.querySelector("#editProjectPath").value.trim(),
    url: document.querySelector("#editProjectUrl").value.trim(),
    port: Number(document.querySelector("#editProjectPort").value || 0),
    command: document.querySelector("#editProjectCommand").value,
    tags: [...new Set(tags)],
    pinned: existing?.pinned || false,
  };
  try {
    await engineAction("dashboard.project.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "项目入口已更新" : "项目入口已添加", { probe: true });
    return true;
  } catch (error) {
    await handleWriteError(error, "保存项目失败");
    return false;
  }
}

async function handlePathAction(event) {
  const action = event.target.closest("[data-action]");
  const row = action?.closest("[data-id]");
  const item = state.paths.find((candidate) => candidate.id === row?.dataset.id);
  if (!action || !item) return;
  if (action.dataset.action === "copy-path") return copyText(item.path, item.name);
  if (action.dataset.action === "edit-path") return openPathEditor(item);
  if (action.dataset.action === "pin-path") {
    try {
      await engineAction("dashboard.path.upsert", { expectedRevision: state.aggregateRevision, item: pathInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "路径已置顶");
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-path" && confirm(`删除“${item.name}”？`)) {
    try {
      await engineAction("dashboard.path.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("路径已删除");
    } catch (error) { await handleWriteError(error, "删除路径失败"); }
  }
}

async function handleNoteAction(event) {
  const action = event.target.closest("[data-action]");
  const row = action?.closest("[data-id]");
  const item = state.notes.find((candidate) => candidate.id === row?.dataset.id);
  if (!action || !item) return;
  if (action.dataset.action === "copy-note") return copyText(item.content, item.title);
  if (action.dataset.action === "edit-note") return openNoteEditor(item);
  if (action.dataset.action === "pin-note") {
    try {
      await engineAction("dashboard.note.upsert", { expectedRevision: state.aggregateRevision, item: noteInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "速记已置顶");
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-note" && confirm(`删除“${item.title}”？`)) {
    try {
      await engineAction("dashboard.note.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("速记已删除");
    } catch (error) { await handleWriteError(error, "删除速记失败"); }
  }
}

async function handleProjectAction(event) {
  const action = event.target.closest("[data-action]");
  const row = action?.closest("[data-id]");
  const item = state.projects.find((candidate) => candidate.id === row?.dataset.id);
  if (!action || !item) return;
  if (action.dataset.action === "copy-project-path") return copyText(item.path, `${item.name} 路径`);
  if (action.dataset.action === "copy-project-command") return copyText(`cd ${item.path} && ${item.command}`, `${item.name} 启动命令`);
  if (action.dataset.action === "edit-project") return openProjectEditor(item);
  if (action.dataset.action === "pin-project") {
    try {
      await engineAction("dashboard.project.upsert", { expectedRevision: state.aggregateRevision, item: projectInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "项目已置顶");
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-project" && confirm(`删除项目入口“${item.name}”？`)) {
    try {
      await engineAction("dashboard.project.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("项目入口已删除", { probe: true });
    } catch (error) { await handleWriteError(error, "删除项目失败"); }
  }
}

async function refreshProjectStatuses() {
  if (!state.connected || !state.projects.length) return;
  try {
    const payload = await engineAction("dashboard.project.probe", { timeoutMs: 1200 });
    state.probeResults = new Map(payload.results.map((item) => [item.projectId, item]));
    renderProjects();
  } catch (error) {
    state.probeResults = new Map();
    renderProjects();
    if (error.code !== "ENGINE_DISCONNECTED") showToast(`项目探测失败：${error.message}`, 2600);
  }
}

async function exportData() {
  try {
    const { backup } = await engineAction("dashboard.backup.export", {});
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-engine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Engine 备份已导出");
  } catch (error) { await handleWriteError(error, "导出失败"); }
}

function importSummary(summary) {
  const part = (name, value) => `${name} +${value.added} / ~${value.updated} / =${value.skipped}`;
  return [part("路径", summary.paths), part("速记", summary.notes), part("项目", summary.projects)].join("；");
}

async function importData(file) {
  try {
    const backup = JSON.parse(await file.text());
    const selected = prompt("输入导入模式：merge（合并）或 replace（替换）", "merge");
    if (selected === null) return;
    const mode = selected.trim().toLowerCase();
    if (!new Set(["merge", "replace"]).has(mode)) throw new Error("导入模式必须是 merge 或 replace。");
    const dryRun = await engineAction("dashboard.backup.import", { backup, mode, dryRun: true });
    if (!confirm(`dry-run 已通过：${importSummary(dryRun.summary)}。\n\n确认以 ${mode} 模式提交？`)) return;
    await engineAction("dashboard.backup.import", { backup, mode, dryRun: false, expectedRevision: state.aggregateRevision });
    await afterWrite("备份已原子导入", { probe: true });
  } catch (error) {
    await handleWriteError(error, "导入失败");
  }
}

function parseLegacyArray(key) {
  try {
    const value = JSON.parse(storageGet(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function legacyData() {
  return { paths: parseLegacyArray(STORAGE_KEYS.paths), notes: parseLegacyArray(STORAGE_KEYS.notes) };
}

function inspectLegacyData() {
  if (!state.connected) return;
  const legacy = legacyData();
  const count = legacy.paths.length + legacy.notes.length;
  const button = document.querySelector("#legacyButton");
  button.hidden = count === 0;
  if (!count) return;
  const migrated = Boolean(storageGet(STORAGE_KEYS.migration));
  document.querySelector("#legacyMigrationSummary").textContent = `检测到 ${legacy.paths.length} 条旧路径、${legacy.notes.length} 条旧速记。${migrated ? "已记录一次成功迁移；旧数据仍保留。" : "尚未记录成功迁移。"}`;
  document.querySelector("#cleanupLegacyButton").hidden = !migrated;
  document.querySelector("#migrateLegacyButton").textContent = migrated ? "再次校验并合并" : "校验并迁移";
  if (!state.legacyChecked && !migrated) {
    state.legacyChecked = true;
    elements.legacyDialog.showModal();
  }
}

async function migrateLegacyData() {
  const legacy = legacyData();
  const backup = { format: "dashboard-key-value-list", version: 1, exportedAt: new Date().toISOString(), paths: legacy.paths, notes: legacy.notes };
  try {
    const dryRun = await engineAction("dashboard.backup.import", { backup, mode: "merge", dryRun: true });
    if (!confirm(`旧数据 dry-run 已通过：${importSummary(dryRun.summary)}。\n\n确认合并到 Dashboard Engine？旧 localStorage 不会被删除。`)) return false;
    const committed = await engineAction("dashboard.backup.import", { backup, mode: "merge", dryRun: false, expectedRevision: state.aggregateRevision });
    storageSet(STORAGE_KEYS.migration, JSON.stringify({ migratedAt: new Date().toISOString(), aggregateRevision: committed.aggregateRevision }));
    await afterWrite("旧数据已迁移；localStorage 原数据仍保留");
    inspectLegacyData();
    return true;
  } catch (error) {
    await handleWriteError(error, "旧数据迁移失败");
    return false;
  }
}

function cleanupLegacyData() {
  if (!confirm("仅删除旧 localStorage 中的 paths 和 notes？主题偏好会保留，此操作不可撤销。")) return false;
  storageRemove(STORAGE_KEYS.paths);
  storageRemove(STORAGE_KEYS.notes);
  document.querySelector("#legacyButton").hidden = true;
  showToast("旧 paths / notes 已手动清理");
  return true;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storageSet(STORAGE_KEYS.theme, theme);
  document.querySelector("#themeButton").innerHTML = icon(theme === "light" ? "moon" : "sun");
}

function focusActiveSearch() {
  const selector = state.activeTab === "paths" ? "#pathSearch" : state.activeTab === "launcher" ? "#projectSearch" : "#noteSearch";
  document.querySelector(selector).focus();
}

function bindDialogSubmit(formSelector, dialog, save) {
  document.querySelector(formSelector).addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "save") return;
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    event.submitter.disabled = true;
    try { if (await save()) dialog.close(); } finally { event.submitter.disabled = false; }
  });
}

function bindEvents() {
  elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  window.addEventListener("hashchange", () => switchTab(location.hash.slice(1), false));
  document.querySelector("#retryConnectionButton").addEventListener("click", () => loadSnapshot());

  document.querySelector("#addPathButton").addEventListener("click", () => openPathEditor());
  document.querySelector("#pathSearch").addEventListener("input", (event) => { state.pathSearch = event.target.value; renderPaths(); });
  document.querySelector("#pathCategory").addEventListener("change", (event) => { state.pathCategory = event.target.value; renderPaths(); });
  document.querySelector("#clearPathFilter").addEventListener("click", () => {
    state.pathSearch = "";
    state.pathCategory = "all";
    document.querySelector("#pathSearch").value = "";
    document.querySelector("#pathCategory").value = "all";
    renderPaths();
  });
  elements.pathList.addEventListener("click", handlePathAction);
  bindDialogSubmit("#editPathForm", elements.editPathDialog, savePathEdit);
  elements.editPathDialog.addEventListener("close", () => {
    const continueDrop = state.pathDialogFromDrop;
    state.pathDialogFromDrop = false;
    document.querySelector("#pathDialogNotice").hidden = true;
    if (continueDrop && state.dropQueue.length) setTimeout(processNextDroppedCandidate, 80);
  });

  document.querySelector("#addProjectButton").addEventListener("click", () => openProjectEditor());
  document.querySelector("#projectSearch").addEventListener("input", (event) => { state.projectSearch = event.target.value; renderProjects(); });
  document.querySelector("#projectFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.projectFilter = button.dataset.filter;
    document.querySelectorAll("#projectFilters button").forEach((item) => item.classList.toggle("is-active", item === button));
    renderProjects();
  });
  elements.projectList.addEventListener("click", handleProjectAction);
  bindDialogSubmit("#editProjectForm", elements.editProjectDialog, saveProjectEdit);

  document.querySelector("#addNoteButton").addEventListener("click", () => openNoteEditor());
  document.querySelector("#noteSearch").addEventListener("input", (event) => { state.noteSearch = event.target.value; renderNotes(); });
  document.querySelector("#clearNoteFilter").addEventListener("click", () => {
    state.noteSearch = "";
    document.querySelector("#noteSearch").value = "";
    renderNotes();
  });
  elements.noteList.addEventListener("click", handleNoteAction);
  bindDialogSubmit("#editNoteForm", elements.editNoteDialog, saveNoteEdit);

  document.querySelector("#exportButton").addEventListener("click", exportData);
  document.querySelector("#importInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importData(file);
    event.target.value = "";
  });
  document.querySelector("#legacyButton").addEventListener("click", () => { inspectLegacyData(); elements.legacyDialog.showModal(); });
  document.querySelector("#legacyMigrationForm").addEventListener("submit", async (event) => {
    if (event.submitter?.value === "migrate") {
      event.preventDefault();
      event.submitter.disabled = true;
      try { if (await migrateLegacyData()) elements.legacyDialog.close(); } finally { event.submitter.disabled = false; }
    }
    if (event.submitter?.value === "cleanup") {
      event.preventDefault();
      if (cleanupLegacyData()) elements.legacyDialog.close();
    }
  });
  document.querySelector("#themeButton").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));

  let dragDepth = 0;
  const hasDropData = (event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain");
  };
  const clearDragState = () => { dragDepth = 0; document.body.classList.remove("is-dragging"); };
  document.addEventListener("dragenter", (event) => {
    if (!hasDropData(event)) return;
    event.preventDefault();
    dragDepth += 1;
    document.body.classList.add("is-dragging");
  });
  document.addEventListener("dragover", (event) => {
    if (!hasDropData(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  document.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove("is-dragging");
  });
  document.addEventListener("drop", (event) => {
    if (!hasDropData(event)) return;
    dragDepth = 0;
    handleDrop(event);
  });
  window.addEventListener("dragend", clearDragState);
  window.addEventListener("blur", clearDragState);

  document.addEventListener("keydown", (event) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if ((event.key === "/" && !typing) || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      focusActiveSearch();
    }
  });
}

applyTheme(storageGet(STORAGE_KEYS.theme) || "dark");
setConnectionStatus("connecting", "正在连接 Dashboard Engine…", "业务数据由 Engine Server 单一持有。");
renderAll();
bindEvents();
switchTab(location.hash.slice(1) || "paths", false);
loadSnapshot();
