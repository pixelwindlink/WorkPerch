import { state } from "./state.js";
import { escapeHtml, icon, showToast } from "./dom.js";
import { CLIPBOARD_HISTORY_LIMIT } from "./clipboard-config.js";
import { clipboardLengthTier, clipboardRowMeta, filterClipboardItems } from "./clipboard-format.js";

const DETAIL_FADE_MS = 160;
let detailRequestToken = 0;
const detailCache = new Map();

function desktopClipboard() {
  return window.perchDesktop?.clipboard || null;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

let clipboardLiveBound = false;

export function syncClipboardWatchPace(active) {
  void window.perchDesktop?.setClipboardPanelActive?.(Boolean(active));
}

export function bindClipboardLiveRefresh() {
  if (clipboardLiveBound || typeof window.perchDesktop?.onClipboardHistoryChange !== "function") return;
  clipboardLiveBound = true;
  window.perchDesktop.onClipboardHistoryChange(() => {
    if (state.activeTab !== "clipboard") return;
    void refreshClipboardHistory().then(() => renderClipboard());
  });
}

export async function refreshClipboardHistory() {
  const api = desktopClipboard();
  if (!api?.list) {
    state.clipboardItems = [];
    state.clipboardAvailable = false;
    return;
  }
  try {
    state.clipboardItems = await api.list();
    state.clipboardAvailable = true;
    detailCache.clear();
  } catch {
    state.clipboardItems = [];
    state.clipboardAvailable = false;
    detailCache.clear();
  }
}

function syncClipboardChrome() {
  const panel = document.querySelector("#clipboardPanel");
  const hint = document.querySelector("#clipboardBrowserHint");
  const meta = document.querySelector("#clipboardMeta");
  if (panel) {
    panel.dataset.desktop = state.clipboardAvailable ? "true" : "false";
    panel.dataset.historyLimit = String(CLIPBOARD_HISTORY_LIMIT);
  }
  if (hint) hint.hidden = state.clipboardAvailable;
  if (meta) {
    meta.textContent = state.clipboardAvailable ? "Desktop" : "Web";
    meta.dataset.state = state.clipboardAvailable ? "live" : "offline";
    meta.title = state.clipboardAvailable
      ? `Desktop 已连接；记录文本、图片与文件，最多 ${CLIPBOARD_HISTORY_LIMIT} 条`
      : "仅 Desktop 记录剪贴板";
  }
}

function markPreviewRow(activeId) {
  for (const row of document.querySelectorAll(".clipboard-row.is-preview")) {
    row.classList.remove("is-preview");
  }
  if (!activeId) return;
  document.querySelector(`.clipboard-row[data-id="${CSS.escape(activeId)}"]`)?.classList.add("is-preview");
}

function detailElements() {
  return {
    text: document.querySelector("#clipboardDetailText"),
    imageWrap: document.querySelector("#clipboardDetailImageWrap"),
    image: document.querySelector("#clipboardDetailImage"),
    files: document.querySelector("#clipboardDetailFiles"),
    meta: document.querySelector("#clipboardDetailMeta"),
  };
}

function hideDetailViews(views) {
  views.text.hidden = true;
  views.imageWrap.hidden = true;
  views.files.hidden = true;
}

async function resolveClipboardDetail(id) {
  if (detailCache.has(id)) return detailCache.get(id);
  const api = desktopClipboard();
  if (!api?.get) return null;
  const item = await api.get(id);
  if (!item) return null;
  detailCache.set(id, item);
  return item;
}

export async function showClipboardDetail(id, { animate = true } = {}) {
  const views = detailElements();
  if (!id || !views.meta) return;

  const listItem = (state.clipboardItems || []).find((entry) => entry.id === id);
  if (!listItem) return;

  state.clipboardPreviewId = id;
  markPreviewRow(id);

  const token = ++detailRequestToken;
  const fade = animate && !prefersReducedMotion();
  if (fade) views.text?.classList.add("is-fading");

  const item = await resolveClipboardDetail(id);
  if (token !== detailRequestToken || !item) return;

  views.meta.textContent = clipboardRowMeta({ ...listItem, ...item });
  hideDetailViews(views);

  if (item.kind === "image" && item.imageDataUrl && views.image && views.imageWrap) {
    views.image.src = item.imageDataUrl;
    views.imageWrap.hidden = false;
  } else if (item.kind === "files" && Array.isArray(item.paths) && views.files) {
    views.files.innerHTML = item.paths
      .map((entry) => `<li><code>${escapeHtml(entry)}</code></li>`)
      .join("");
    views.files.hidden = false;
  } else if (views.text) {
    views.text.textContent = item.text ?? listItem.preview ?? "";
    views.text.hidden = false;
  }

  if (fade) views.text?.classList.remove("is-fading");
}

function ensureDefaultPreview(items) {
  if (!items.length) {
    state.clipboardPreviewId = "";
    return;
  }
  if (!items.some((item) => item.id === state.clipboardPreviewId)) {
    state.clipboardPreviewId = items[0].id;
  }
}

function rowPreviewLabel(item) {
  const kind = item.kind || "text";
  if (kind === "image") return `[图片] ${item.preview}`;
  if (kind === "files") return `[文件] ${item.preview}`;
  return item.preview;
}

export function renderClipboard() {
  const list = document.querySelector("#clipboardList");
  const empty = document.querySelector("#clipboardEmpty");
  const count = document.querySelector("#clipboardVisibleCount");
  const split = document.querySelector("#clipboardSplit");
  if (!list || !empty) return;

  syncClipboardChrome();
  const items = filterClipboardItems(state.clipboardItems || [], state.clipboardSearch);
  if (count) count.textContent = String(items.length);

  list.innerHTML = items.map((item, index) => {
    const kind = item.kind || "text";
    const tier = kind === "text" ? clipboardLengthTier(item.length || 0) : { id: kind };
    const preview = escapeHtml(rowPreviewLabel(item));
    const meta = escapeHtml(clipboardRowMeta(item));
    const previewActive = item.id === state.clipboardPreviewId ? " is-preview" : "";
    return `
    <div class="clipboard-row clipboard-row--${kind}${previewActive}" role="listitem" data-id="${escapeHtml(item.id)}" data-kind="${kind}" tabindex="0">
      <span class="clipboard-idx" aria-hidden="true">${index + 1}</span>
      <button class="clipboard-preview" type="button" data-action="copy-clipboard" title="${preview}">${preview}</button>
      <span class="clipboard-meta clipboard-tier--${tier.id}">${meta}</span>
      <button class="row-button clipboard-copy" data-action="copy-clipboard" data-label="复制" type="button" aria-label="复制到系统剪贴板">${icon("copy")}</button>
    </div>`;
  }).join("");

  const hasSource = (state.clipboardItems || []).length > 0;
  const filteredEmpty = hasSource && items.length === 0;
  const title = empty.querySelector("[data-empty-title]");
  const copy = empty.querySelector("[data-empty-copy]");
  if (title) title.textContent = filteredEmpty ? "没有匹配的剪贴板记录" : "还没有剪贴板历史";
  if (copy) {
    copy.textContent = filteredEmpty
      ? "试试更短的关键词，或清空上方筛选框。"
      : "Desktop 会在本机复制文本、图片或文件后自动记录；悬停条目可预览，点击可复制回系统剪贴板。";
  }
  empty.hidden = items.length > 0;
  if (split) split.hidden = items.length === 0;

  ensureDefaultPreview(items);
  if (items.length > 0) {
    void showClipboardDetail(state.clipboardPreviewId, { animate: false });
  } else {
    markPreviewRow("");
    const views = detailElements();
    hideDetailViews(views);
    if (views.text) views.text.textContent = "";
    if (views.image) views.image.removeAttribute("src");
    if (views.files) views.files.innerHTML = "";
    if (views.meta) views.meta.textContent = "";
  }
}

export function handleClipboardRowPointer(event) {
  const row = event.target.closest(".clipboard-row");
  if (!row?.dataset.id) return;
  if (row.dataset.id === state.clipboardPreviewId) return;
  void showClipboardDetail(row.dataset.id, { animate: true });
}

export function bindClipboardDetailPreview() {
  const list = document.querySelector("#clipboardList");
  if (!list || list.dataset.previewBound === "true") return;
  list.dataset.previewBound = "true";
  list.addEventListener("pointerenter", handleClipboardRowPointer, true);
  list.addEventListener("focusin", (event) => {
    const row = event.target.closest(".clipboard-row");
    if (!row?.dataset.id) return;
    void showClipboardDetail(row.dataset.id, { animate: true });
  });
}

export async function handleClipboardAction(event) {
  const trigger = event.target.closest("[data-action='copy-clipboard']");
  const row = event.target.closest(".clipboard-row");
  if (!trigger && !row) return;
  const targetRow = trigger?.closest(".clipboard-row") || row;
  const api = desktopClipboard();
  if (!api?.copy) return showToast("剪贴板仅在 Desktop 可用");
  try {
    const result = await api.copy(targetRow.dataset.id);
    if (!result?.id) return showToast("条目不存在或已过期");
    const kind = result.kind || "text";
    const message = kind === "image"
      ? "图片已写入系统剪贴板"
      : kind === "files"
        ? "文件已写入系统剪贴板"
        : "已复制到系统剪贴板";
    showToast(message);
    targetRow.classList.add("is-copied");
    setTimeout(() => targetRow.classList.remove("is-copied"), 480);
  } catch {
    showToast("复制失败");
  }
}

export function handleClipboardCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest(".clipboard-row");
  if (!row || event.target.closest("[data-action='copy-clipboard']")) return;
  event.preventDefault();
  row.querySelector("[data-action='copy-clipboard']")?.click();
}
