import { state } from "./state.js";
import { elements, tagNames, parseTagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";
import { setButtonKeyboardLabel } from "./keyboard.js";
import { NOTE_CONTENT_MAX_LENGTH, normalizeClipboardNoteContent, suggestNoteTitleFromClipboard } from "./note-paste-create.js";
import { allocateAutoNoteTitle, isNoteTitleTaken, resolveNoteTitleForSave } from "./note-auto-key.js";

export function noteInput(item, changes = {}) {
  return { id: item.id, title: item.title, content: item.content, tagIds: item.tagIds, pinned: item.pinned, ...changes };
}

export function openNoteEditor(item = null) {
  if (!state.connected) return showToast("请先连接 WorkPerch Server");
  const editing = Boolean(item?.id);
  document.querySelector("#noteDialogKicker").textContent = editing ? "EDIT PAIR" : "ADD PAIR";
  document.querySelector("#noteDialogTitle").textContent = editing ? "编辑速记" : "添加速记";
  setButtonKeyboardLabel("#noteDialogSubmit", editing ? "保存修改" : "添加速记", "Enter");
  const keyInput = document.querySelector("#editNoteKey");
  const valueInput = document.querySelector("#editNoteValue");
  document.querySelector("#editNoteId").value = item?.id || "";
  keyInput.value = editing ? (item?.title || "") : allocateAutoNoteTitle(state.notes);
  keyInput.readOnly = false;
  keyInput.placeholder = editing ? "" : "可自定义；留空则自动编号";
  keyInput.removeAttribute("aria-readonly");
  valueInput.maxLength = NOTE_CONTENT_MAX_LENGTH;
  valueInput.value = item?.content || "";
  document.querySelector("#editNoteTags").value = tagNames(item).join(", ");
  elements.editNoteDialog.showModal();
  setTimeout(() => valueInput.focus(), 0);
}

export async function createNoteFromClipboard() {
  if (!state.connected) return showToast("请先连接 WorkPerch Server");
  let raw;
  try {
    raw = await navigator.clipboard.readText();
  } catch {
    return showToast("无法读取系统剪贴板", 2800);
  }
  const { content, truncated } = normalizeClipboardNoteContent(raw);
  if (!content) return showToast("剪贴板没有可用文本", 2400);
  const item = {
    title: suggestNoteTitleFromClipboard(content),
    content,
    tags: [],
    pinned: false,
  };
  try {
    const result = await engineAction("perch.note.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(truncated ? "已从剪贴板添加速记（内容已截断至 10000 字）" : "已从剪贴板添加速记", {
      result,
      patch: { type: "upsert", collection: "notes" },
    });
    if (result?.item) {
      const { revealExistingNote } = await import("./render-notes.js");
      revealExistingNote(result.item, "");
    }
    return true;
  } catch (error) {
    await handleWriteError(error, "从剪贴板添加速记失败");
    return false;
  }
}

export async function saveNoteEdit() {
  const id = document.querySelector("#editNoteId").value;
  const existing = state.notes.find((item) => item.id === id);
  const keyInput = document.querySelector("#editNoteKey");
  let title = resolveNoteTitleForSave(keyInput.value, state.notes, { exceptId: id || undefined });
  if (id && !String(keyInput.value ?? "").trim()) return showToast("KEY 不能为空"), false;
  if (isNoteTitleTaken(state.notes, title, { exceptId: id || undefined })) {
    showToast(`KEY「${title}」已被占用，请换一个`, 2800);
    if (id) keyInput.focus();
    return false;
  }
  const rawContent = document.querySelector("#editNoteValue").value.trim();
  if (!rawContent) {
    showToast("VALUE 不能为空");
    document.querySelector("#editNoteValue").focus();
    return false;
  }
  const { content, truncated } = normalizeClipboardNoteContent(rawContent);
  if (truncated) {
    showToast(`内容超过 ${NOTE_CONTENT_MAX_LENGTH} 字，已截断保存`, 3200);
    document.querySelector("#editNoteValue").value = content;
  }
  const item = {
    ...(id ? { id } : {}),
    title,
    content,
    tags: parseTagNames(document.querySelector("#editNoteTags").value),
    pinned: existing?.pinned || false,
  };
  try {
    const result = await engineAction("perch.note.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "速记已更新" : "速记已添加", { result, patch: { type: "upsert", collection: "notes" } });
    return true;
  } catch (error) {
    await handleWriteError(error, "保存速记失败");
    return false;
  }
}
