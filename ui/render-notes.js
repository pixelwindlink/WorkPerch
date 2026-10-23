import { state } from "./state.js";
import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, formatDate, showToast, withPreservedWindowScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, copyText, switchTab } from "./engine-client.js";
import { compareRecords } from "./render-shared.js";
import { openNoteEditor, noteInput } from "./dialogs-note.js";
import { requestConfirm } from "./confirm.js";
import { matchesNoteLengthFilter } from "./note-length-filter.js";
import { syncNoteLengthFilterButtons } from "./note-length-filter-ui.js";
import { persistNoteLengthFilter } from "./note-length-preferences.js";
import { noteIdFromDoubleClickTarget } from "./note-double-click.js";

const NOTE_COPY_DEFER_MS = 280;
let noteCopyDeferTimer = null;

export function renderNoteGroups() {
  const groups = [...state.tags].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const select = document.querySelector("#noteCategory");
  const current = state.noteCategory;
  select.innerHTML = '<option value="all">全部标签</option>' + groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
  select.value = groups.some((group) => group.id === current) ? current : "all";
  state.noteCategory = select.value;
  document.querySelector("#noteGroupCount").textContent = String(groups.length);
  syncNoteLengthFilterButtons();
  const thresholdInput = document.querySelector("#noteShortMaxChars");
  if (thresholdInput) thresholdInput.value = String(state.noteShortMaxChars);
}

export function renderNotes() {
  renderNoteGroups();
  withPreservedWindowScroll(() => {
    const query = normalize(state.noteSearch);
    const rows = [...state.notes]
      .filter((item) => {
        const groupMatches = state.noteCategory === "all" || item.tagIds.includes(state.noteCategory);
        const lengthMatches = matchesNoteLengthFilter(item.content, state.noteLengthFilter, state.noteShortMaxChars);
        return groupMatches && lengthMatches && (!query || normalize([item.title, item.content, ...tagNames(item)].join(" ")).includes(query));
      })
      .sort((a, b) => compareRecords(a, b, (value) => value.title));
    elements.noteList.innerHTML = rows.map((item) => `
    <article class="note-item ${item.pinned ? "is-pinned" : ""} ${state.highlightNoteId === item.id ? "duplicate-hit" : ""}" role="listitem" data-id="${escapeHtml(item.id)}">
      <header class="note-item-head">
        <div class="note-item-keyline">
          <strong class="note-item-key" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
          <span class="tag-strip">${renderTagChips(item)}</span>
        </div>
        <time class="note-item-meta" datetime="${escapeHtml(item.updatedAt || "")}">${formatDate(item.updatedAt)}</time>
        <div class="row-actions note-item-actions">
          <button class="row-button ${item.pinned ? "is-active" : ""}" data-action="pin-note" data-label="${item.pinned ? "取消置顶" : "置顶"}" ${item.pinned ? 'data-long="true"' : ""} type="button" ${state.connected ? "" : "disabled"} aria-label="${item.pinned ? "取消置顶" : "置顶"}">${icon("pin")}</button>
          <button class="row-button" data-action="copy-note" data-label="复制" type="button" aria-label="复制">${icon("copy")}</button>
          <button class="row-button" data-action="edit-note" data-label="编辑" type="button" ${state.connected ? "" : "disabled"} aria-label="编辑">${icon("edit")}</button>
          <button class="row-button danger" data-action="delete-note" data-label="删除" type="button" ${state.connected ? "" : "disabled"} aria-label="删除">${icon("trash")}</button>
        </div>
      </header>
      <button class="note-item-body" data-action="copy-note" type="button" title="单击复制，双击编辑">${escapeHtml(item.content)}</button>
    </article>`).join("");
    document.querySelector("#noteCount").textContent = String(state.notes.length);
    document.querySelector("#totalNoteCount").textContent = String(state.notes.length);
    document.querySelector("#visibleNoteCount").textContent = String(rows.length);
    elements.noteEmpty.hidden = rows.length > 0;
  });
}

export async function handleNoteAction(event) {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const row = action?.closest("[data-id]");
  const item = state.notes.find((candidate) => candidate.id === row?.dataset.id);
  if (!item) return;
  if (action.dataset.action === "copy-note") {
    clearTimeout(noteCopyDeferTimer);
    noteCopyDeferTimer = setTimeout(() => {
      noteCopyDeferTimer = null;
      void copyText(item.content, item.title, { kind: "note", id: item.id });
    }, NOTE_COPY_DEFER_MS);
    return;
  }
  if (action.dataset.action === "edit-note") return openNoteEditor(item);
  if (action.dataset.action === "pin-note") {
    try {
      const result = await engineAction("perch.note.upsert", { expectedRevision: state.aggregateRevision, item: noteInput(item, { pinned: !item.pinned }) });
      await afterWrite(item.pinned ? "已取消置顶" : "速记已置顶", { result, patch: { type: "upsert", collection: "notes" } });
    } catch (error) { await handleWriteError(error, "置顶操作失败"); }
  }
  if (action.dataset.action === "delete-note") {
    if (!(await requestConfirm({
      title: "删除速记",
      message: `删除“${item.title}”？`,
      confirmLabel: "删除",
      danger: true,
    }))) return;
    try {
      const result = await engineAction("perch.note.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("速记已删除", { result, patch: { type: "delete", collection: "notes" } });
    } catch (error) { await handleWriteError(error, "删除速记失败"); }
  }
}

export function handleNoteDoubleClick(event) {
  const id = noteIdFromDoubleClickTarget(event.target);
  if (!id) return;
  clearTimeout(noteCopyDeferTimer);
  noteCopyDeferTimer = null;
  const item = state.notes.find((candidate) => candidate.id === id);
  if (!item) return;
  event.preventDefault();
  openNoteEditor(item);
}

export function revealExistingNote(item, message = `已定位速记：${item.title}`) {
  switchTab("notes");
  state.noteSearch = "";
  state.noteCategory = "all";
  state.highlightNoteId = item.id;
  document.querySelector("#noteSearch").value = "";
  document.querySelector("#noteCategory").value = "all";
  persistNoteLengthFilter("all");
  syncNoteLengthFilterButtons();
  renderNotes();
  requestAnimationFrame(() => elements.noteList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  setTimeout(() => {
    elements.noteList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.remove("duplicate-hit");
    if (state.highlightNoteId === item.id) state.highlightNoteId = null;
  }, 1450);
  if (message) showToast(message);
}
