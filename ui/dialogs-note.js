import { state } from "./state.js";
import { elements, tagNames, parseTagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";
import { setButtonKeyboardLabel } from "./keyboard.js";

export function noteInput(item, changes = {}) {
  return { id: item.id, title: item.title, content: item.content, tagIds: item.tagIds, pinned: item.pinned, ...changes };
}

export function openNoteEditor(item = null) {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  const editing = Boolean(item?.id);
  document.querySelector("#noteDialogKicker").textContent = editing ? "EDIT PAIR" : "ADD PAIR";
  document.querySelector("#noteDialogTitle").textContent = editing ? "编辑速记" : "添加速记";
  setButtonKeyboardLabel("#noteDialogSubmit", editing ? "保存修改" : "添加速记", "Enter");
  document.querySelector("#editNoteId").value = item?.id || "";
  document.querySelector("#editNoteKey").value = item?.title || "";
  document.querySelector("#editNoteValue").value = item?.content || "";
  document.querySelector("#editNoteTags").value = tagNames(item).join(", ");
  elements.editNoteDialog.showModal();
  setTimeout(() => document.querySelector("#editNoteKey").focus(), 0);
}

export async function saveNoteEdit() {
  const id = document.querySelector("#editNoteId").value;
  const existing = state.notes.find((item) => item.id === id);
  const item = {
    ...(id ? { id } : {}),
    title: document.querySelector("#editNoteKey").value.trim(),
    content: document.querySelector("#editNoteValue").value.trim(),
    tags: parseTagNames(document.querySelector("#editNoteTags").value),
    pinned: existing?.pinned || false,
  };
  try {
    const result = await engineAction("dashboard.note.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "速记已更新" : "速记已添加", { result, patch: { type: "upsert", collection: "notes" } });
    return true;
  } catch (error) {
    await handleWriteError(error, "保存速记失败");
    return false;
  }
}
