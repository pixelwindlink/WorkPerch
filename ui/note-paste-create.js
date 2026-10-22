export const NOTE_CONTENT_MAX_LENGTH = 10_000;
export const NOTE_TITLE_MAX_LENGTH = 120;

export function suggestNoteTitleFromClipboard(text, now = new Date()) {
  const normalized = String(text ?? "").trim();
  const firstLine = normalized.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  if (firstLine) {
    if (firstLine.length <= NOTE_TITLE_MAX_LENGTH) return firstLine;
    return `${firstLine.slice(0, NOTE_TITLE_MAX_LENGTH - 1)}…`;
  }
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `粘贴 ${stamp}`;
}

export function shouldCreateNoteFromPaste(event, activeTab) {
  if (activeTab !== "notes") return false;
  if (event.key?.toLowerCase() !== "v" || !(event.metaKey || event.ctrlKey)) return false;
  if (event.isComposing || event.altKey) return false;
  const element = event.target;
  if (!element || typeof element.closest !== "function") return true;
  if (element.closest("dialog[open], #summonOverlay")) return false;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return false;
  if (tag === "INPUT") return false;
  if (element.isContentEditable) return false;
  return true;
}

export function normalizeClipboardNoteContent(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return { content: "", truncated: false };
  if (trimmed.length <= NOTE_CONTENT_MAX_LENGTH) return { content: trimmed, truncated: false };
  return { content: trimmed.slice(0, NOTE_CONTENT_MAX_LENGTH), truncated: true };
}
