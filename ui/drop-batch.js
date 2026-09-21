import { state } from "./state.js";
import { elements, escapeHtml, parseTagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, switchTab } from "./engine-client.js";
import { comparablePath, normalizeDroppedPath, pathName, findExistingPath, revealExistingPath } from "./render-paths.js";
import { inspectionLabel } from "./render-shared.js";
import { openPathEditor } from "./dialogs-path.js";

export function desktopDroppedPath(file) {
  try {
    return normalizeDroppedPath(window.perchDesktop?.getPathForFile?.(file) || "");
  } catch {
    return "";
  }
}

export function extractDroppedCandidates(dataTransfer) {
  const itemMetadata = Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => {
      const entry = item.webkitGetAsEntry?.();
      const file = item.getAsFile?.();
      return {
        name: entry?.name || file?.name || "",
        isDirectory: Boolean(entry?.isDirectory),
        directPath: desktopDroppedPath(file) || normalizeDroppedPath(file?.path || "")
      };
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

export function processNextDroppedCandidate() {
  while (state.dropQueue.length) {
    const candidate = state.dropQueue.shift();
    const existing = candidate.path ? findExistingPath(candidate.path) : null;
    if (existing) {
      revealExistingPath(existing);
      continue;
    }
    openPathEditor({ name: candidate.name || pathName(candidate.path), path: candidate.path, group: candidate.isDirectory ? "文件夹" : "文件", description: "" }, {
      fromDrop: true,
      notice: candidate.path
        ? (window.perchDesktop ? "Desktop Shell 已识别真实绝对路径，请确认后添加。" : "已从拖放内容中识别到绝对路径，请确认后添加。")
        : "普通浏览器不会暴露本机绝对路径。文件名已识别；可在 Finder 按 ⌥⌘C 复制路径后粘贴到 VALUE。",
    });
    return;
  }
}

export function renderDropBatchPlan() {
  const list = document.querySelector("#dropBatchList");
  list.innerHTML = state.dropPlan.map((candidate) => {
    const blocked = Boolean(candidate.existing) || candidate.duplicateOf !== null || candidate.inspection.status === "invalid";
    const reason = candidate.existing
      ? `已收录为${candidate.existing.kind === "path" ? "路径" : "项目"}：${candidate.existing.name}（${candidate.existing.path || candidate.path}）`
      : candidate.duplicateOf !== null
        ? `与第 ${candidate.duplicateOf + 1} 项重复`
        : inspectionLabel({ inspection: candidate.inspection });
    return `<div class="batch-row" data-batch-index="${candidate.index}">
      <input class="batch-include" type="checkbox" ${blocked ? "" : "checked"} ${blocked ? "disabled" : ""} aria-label="选择 ${escapeHtml(candidate.path)}" />
      <div class="batch-main"><input class="batch-name" value="${escapeHtml(candidate.inspection.suggestedName || pathName(candidate.path))}" maxlength="120" ${blocked ? "disabled" : ""} /><code>${escapeHtml(candidate.path)}</code><small>${escapeHtml(reason)}</small>${candidate.existing ? `<button class="quiet-button batch-reveal" type="button" data-existing-kind="${escapeHtml(candidate.existing.kind)}" data-existing-id="${escapeHtml(candidate.existing.id)}">查看已收录</button>` : ""}</div>
      <select class="batch-target" ${blocked ? "disabled" : ""}><option value="path" ${candidate.suggestedTarget === "path" ? "selected" : ""}>文件路径</option><option value="project" ${candidate.suggestedTarget === "project" ? "selected" : ""}>项目入口</option></select>
    </div>`;
  }).join("");
}

export async function revealExistingEntry(kind, id) {
  if (kind === "project") {
    const item = state.projects.find((candidate) => candidate.id === id);
    if (!item) return showToast("未找到对应项目入口");
    elements.dropBatchDialog.close();
    switchTab("launcher");
    state.projectSearch = item.name;
    document.querySelector("#projectSearch").value = item.name;
    const { renderProjects } = await import("./render-projects.js");
    renderProjects();
    requestAnimationFrame(() => document.querySelector(`#projectList [data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    showToast(`已定位项目：${item.name} → ${item.path}`, 3600);
    return;
  }
  const item = state.paths.find((candidate) => candidate.id === id);
  if (!item) return showToast("未找到对应路径");
  elements.dropBatchDialog.close();
  revealExistingPath(item, `已定位路径：${item.name} → ${item.path}`);
}

export async function openDropBatch(paths) {
  try {
    const result = await engineAction("perch.path.preflight", { paths });
    state.dropPlan = result.candidates;
    renderDropBatchPlan();
    document.querySelector("#dropBatchTags").value = "";
    elements.dropBatchDialog.showModal();
  } catch (error) {
    await handleWriteError(error, "拖入路径预检失败");
  }
}

export async function saveDropBatch() {
  const tags = parseTagNames(document.querySelector("#dropBatchTags").value);
  const items = [...document.querySelectorAll("#dropBatchList [data-batch-index]")].filter((row) => row.querySelector(".batch-include").checked).map((row) => {
    const candidate = state.dropPlan[Number(row.dataset.batchIndex)];
    const target = row.querySelector(".batch-target").value;
    const name = row.querySelector(".batch-name").value.trim() || candidate.inspection.suggestedName || pathName(candidate.path);
    const item = target === "path"
      ? { name, path: candidate.path, tags, description: "", pinned: false }
      : { name, type: candidate.inspection.projectType || "other", label: candidate.inspection.projectType || "Other", description: candidate.inspection.gitRoot ? "Git 工程" : "拖入识别", path: candidate.path, url: "", port: 0, command: "", tags, pinned: false };
    return { target, inspection: candidate.inspection, item };
  });
  if (!items.length) {
    showToast("没有选择需要添加的路径");
    return false;
  }
  try {
    await engineAction("perch.path.batch-upsert", { expectedRevision: state.aggregateRevision, items });
    await afterWrite(`已原子添加 ${items.length} 个入口`, { probe: true });
    return true;
  } catch (error) {
    await handleWriteError(error, "批量添加失败");
    return false;
  }
}

export async function handleDrop(event) {
  event.preventDefault();
  document.body.classList.remove("is-dragging");
  if (!state.connected) {
    showToast("请先连接 WorkPerch Server");
    return;
  }
  switchTab("paths");
  const candidates = extractDroppedCandidates(event.dataTransfer);
  if (!candidates.length) {
    showToast("没有识别到可收录的文件或文件夹");
    return;
  }
  const absolute = candidates.filter((candidate) => candidate.path);
  if (absolute.length === candidates.length) {
    await openDropBatch(absolute.map((candidate) => candidate.path));
    return;
  }
  state.dropQueue = candidates;
  processNextDroppedCandidate();
}
