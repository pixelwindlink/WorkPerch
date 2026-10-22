import { state } from "./state.js";
import { escapeHtml, icon, showToast } from "./dom.js";
import { copyText } from "./engine-client.js";
import { CLIPBOARD_HISTORY_LIMIT } from "./clipboard-config.js";
import { clipboardLengthTier, filterClipboardItems, formatClipboardTimestamp } from "./clipboard-format.js";

const DETAIL_FADE_MS = 160;
let detailRequestToken = 0;
const fullTextCache = new Map();

function desktopClipboard() {
  return window.perchDesktop?.clipboard || null;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
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
    fullTextCache.clear();
  } catch {
    state.clipboardItems = [];
    state.clipboardAvailable = false;
    fullTextCache.clear();
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
      ? `Desktop 已连接；环形缓冲最多 ${CLIPBOARD_HISTORY_LIMIT} 条，满则覆盖最旧`
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

async function resolveFullText(id) {
  if (fullTextCache.has(id)) return fullTextCache.get(id);
  const api = desktopClipboard();
  if (!api?.get) return null;
  const item = await api.get(id);
  if (!item?.text) return null;
  fullTextCache.set(id, item.text);
  return item.text;
}

export async function showClipboardDetail(id, { animate = true } = {}) {
  const detailMeta = document.querySelector("#clipboardDetailMeta");
  const detailText = document.querySelector("#clipboardDetailText");
  if (!id || !detailMeta || !detailText) return;

  const listItem = (state.clipboardItems || []).find((entry) => entry.id === id);
  if (!listItem) return;

  state.clipboardPreviewId = id;
  markPreviewRow(id);

  const token = ++detailRequestToken;
  const tier = clipboardLengthTier(listItem.length || 0);
  const when = formatClipboardTimestamp(listItem.capturedAt);
  const metaLine = `${tier.label} · ${listItem.length} 字 · ${when}`;

  const fade = animate && !prefersReducedMotion();
  if (fade) detailText.classList.add("is-fading");
  if (fade) await new Promise((resolve) => setTimeout(resolve, DETAIL_FADE_MS * 0.55));

  const text = await resolveFullText(id);
  if (token !== detailRequestToken) return;

  detailMeta.textContent = metaLine;
  detailText.textContent = text ?? listItem.preview ?? "";
  if (fade) {
    detailText.classList.remove("is-fading");
  } else {
    detailText.classList.remove("is-fading");
  }
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
    const tier = clipboardLengthTier(item.length || 0);
    const when = formatClipboardTimestamp(item.capturedAt);
    const preview = escapeHtml(item.preview);
    const previewActive = item.id === state.clipboardPreviewId ? " is-preview" : "";
    return `
    <div class="clipboard-row${previewActive}" role="listitem" data-id="${escapeHtml(item.id)}" tabindex="0">
      <span class="clipboard-idx" aria-hidden="true">${index + 1}</span>
      <button class="clipboard-preview" type="button" data-action="copy-clipboard" title="${preview}">${preview}</button>
      <span class="clipboard-meta clipboard-tier--${tier.id}">${tier.label}·${item.length}字·${escapeHtml(when)}</span>
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
      : "Desktop 复制文本后会自动出现在列表；悬停条目可在下方查看全文，点击行或复制按钮可再次写入系统剪贴板。";
  }
  empty.hidden = items.length > 0;
  if (split) split.hidden = items.length === 0;

  ensureDefaultPreview(items);
  if (items.length > 0) {
    void showClipboardDetail(state.clipboardPreviewId, { animate: false });
  } else {
    markPreviewRow("");
    const detailText = document.querySelector("#clipboardDetailText");
    const detailMeta = document.querySelector("#clipboardDetailMeta");
    if (detailText) detailText.textContent = "";
    if (detailMeta) detailMeta.textContent = "";
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
    const item = await api.copy(targetRow.dataset.id);
    if (!item?.text) return showToast("条目不存在或已过期");
    await copyText(item.text, "剪贴板历史", { silentToast: true });
    showToast("已复制到系统剪贴板");
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
