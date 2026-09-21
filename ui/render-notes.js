import { state } from "./state.js";
import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, formatDate, showToast, withPreservedWindowScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, copyText, switchTab } from "./engine-client.js";
import { compareRecords } from "./render-shared.js";
import { openNoteEditor, noteInput } from "./dialogs-note.js";
import { requestConfirm } from "./confirm.js";
import { bindUsageHomeScroll } from "./usage-home.js";

export function renderNoteGroups() {
  const groups = [...state.tags].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const select = document.querySelector("#noteCategory");
  const current = state.noteCategory;
  select.innerHTML = '<option value="all">全部标签</option>' + groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
  select.value = groups.some((group) => group.id === current) ? current : "all";
  state.noteCategory = select.value;
  document.querySelector("#noteGroupCount").textContent = String(groups.length);
}

function renderNoteUsageHome() {
  const home = document.querySelector("#noteUsageHome");
  const limit = 8;
  const recent = [...state.notes]
    .filter((item) => item.usage?.lastUsedAt)
    .sort((a, b) => Date.parse(b.usage.lastUsedAt) - Date.parse(a.usage.lastUsedAt) || a.title.localeCompare(b.title, "zh-CN"))
    .slice(0, limit);
  const frequent = [...state.notes]
    .filter((item) => (item.usage?.count || 0) > 0)
    .sort((a, b) => (b.usage.count || 0) - (a.usage.count || 0) || Date.parse(b.usage?.lastUsedAt || 0) - Date.parse(a.usage?.lastUsedAt || 0) || a.title.localeCompare(b.title, "zh-CN"))
    .slice(0, limit);
  if (!recent.length && !frequent.length) {
    home.hidden = true;
    home.innerHTML = "";
    return;
  }
  const section = (title, items, kind) => {
    if (!items.length) return "";
    return `<div class="usage-home-section" data-kind="${kind}"><span class="usage-home-label">${title}</span><div class="usage-home-chips" tabindex="0">${items.map((item) => `<button class="usage-chip" type="button" data-action="reveal-usage-note" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.content)}">${escapeHtml(item.title)}</button>`).join("")}</div></div>`;
  };
  home.hidden = false;
  home.innerHTML = [
    '<div class="usage-home-heading"><strong>最近入口</strong><span>优先复制最近与常用速记</span></div>',
    section("最近速记", recent, "recent-notes"),
    section("常用速记", frequent, "frequent-notes"),
  ].join("");
  bindUsageHomeScroll(home);
}

export function renderNotes() {
  renderNoteGroups();
  renderNoteUsageHome();
  withPreservedWindowScroll(() => {
    const query = normalize(state.noteSearch);
    const rows = [...state.notes]
      .filter((item) => {
        const groupMatches = state.noteCategory === "all" || item.tagIds.includes(state.noteCategory);
        return groupMatches && (!query || normalize([item.title, item.content, ...tagNames(item)].join(" ")).includes(query));
      })
      .sort((a, b) => compareRecords(a, b, (value) => value.title));
    elements.noteList.innerHTML = rows.map((item) => `
    <div class="kv-row note-row ${item.pinned ? "is-pinned" : ""} ${state.highlightNoteId === item.id ? "duplicate-hit" : ""}" data-id="${escapeHtml(item.id)}">
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
  if (!action) return;
  if (action.dataset.action === "reveal-usage-note") {
    const note = state.notes.find((candidate) => candidate.id === action.dataset.id);
    if (!note) return showToast("未找到对应速记");
    revealExistingNote(note);
    return;
  }
  const row = action?.closest("[data-id]");
  const item = state.notes.find((candidate) => candidate.id === row?.dataset.id);
  if (!item) return;
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

export function revealExistingNote(item, message = `已定位速记：${item.title}`) {
  switchTab("notes");
  state.noteSearch = "";
  state.noteCategory = "all";
  state.highlightNoteId = item.id;
  document.querySelector("#noteSearch").value = "";
  document.querySelector("#noteCategory").value = "all";
  renderNotes();
  requestAnimationFrame(() => elements.noteList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  setTimeout(() => {
    elements.noteList.querySelector(`[data-id="${CSS.escape(item.id)}"]`)?.classList.remove("duplicate-hit");
    if (state.highlightNoteId === item.id) state.highlightNoteId = null;
  }, 1450);
  if (message) showToast(message);
}
