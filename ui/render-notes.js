import { state } from "./state.js";
import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, formatDate, withPreservedWindowScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, copyText } from "./engine-client.js";
import { compareRecords } from "./render-shared.js";
import { openNoteEditor, noteInput } from "./dialogs-note.js";
import { requestConfirm } from "./confirm.js";

export function renderNotes() {
  withPreservedWindowScroll(() => {
    const query = normalize(state.noteSearch);
    const rows = [...state.notes]
      .filter((item) => !query || normalize([item.title, item.content, ...tagNames(item)].join(" ")).includes(query))
      .sort((a, b) => compareRecords(a, b, (value) => value.title));
    elements.noteList.innerHTML = rows.map((item) => `
    <div class="kv-row note-row ${item.pinned ? "is-pinned" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="kv-key"><strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong><small>${item.pinned ? "PINNED · " : ""}KEY</small><span class="tag-strip">${renderTagChips(item)}</span></div>
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
  });
}

export async function handleNoteAction(event) {
  const action = event.target.closest("[data-action]");
  const row = action?.closest("[data-id]");
  const item = state.notes.find((candidate) => candidate.id === row?.dataset.id);
  if (!action || !item) return;
  if (action.dataset.action === "copy-note") return copyText(item.content, item.title, { kind: "note", id: item.id });
  if (action.dataset.action === "edit-note") return openNoteEditor(item);
  if (action.dataset.action === "pin-note") {
    try {
      const result = await engineAction("dashboard.note.upsert", { expectedRevision: state.aggregateRevision, item: noteInput(item, { pinned: !item.pinned }) });
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
      const result = await engineAction("dashboard.note.delete", { id: item.id, expectedRevision: state.aggregateRevision });
      await afterWrite("速记已删除", { result, patch: { type: "delete", collection: "notes" } });
    } catch (error) { await handleWriteError(error, "删除速记失败"); }
  }
}
