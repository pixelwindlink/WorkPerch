export const DEFAULT_NOTE_SHORT_MAX_CHARS = 100;
export const NOTE_SHORT_MAX_CHARS_LIMIT = { min: 1, max: 5000 };
/** Shift+Tab 循环顺序：全部长度 → 长文本 → 短文本 */
export const NOTE_LENGTH_FILTER_ORDER = Object.freeze(["all", "long", "short"]);

export function nextNoteLengthFilter(current, step = 1) {
  const order = NOTE_LENGTH_FILTER_ORDER;
  const index = Math.max(0, order.indexOf(parseNoteLengthFilter(current)));
  return order[(index + step + order.length) % order.length];
}

export function shouldCycleNoteLengthFilterOnShiftTab(event, activeTab) {
  if (activeTab !== "notes") return false;
  if (event.key !== "Tab" || event.isComposing || !event.shiftKey) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const element = event.target;
  if (!element || typeof element.closest !== "function") return true;
  if (element.closest("dialog[open], #summonOverlay")) return false;
  if (element.closest("textarea")) return false;
  const input = element.closest("input");
  if (input && (input.id === "noteSearch" || input.id === "noteShortMaxChars")) return false;
  if (element.closest?.("#editNoteForm, #editPathForm")) return false;
  return true;
}

export function parseNoteLengthFilter(value) {
  return value === "short" || value === "long" ? value : "all";
}

export function parseNoteShortMaxChars(raw) {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_NOTE_SHORT_MAX_CHARS;
  return Math.min(NOTE_SHORT_MAX_CHARS_LIMIT.max, Math.max(NOTE_SHORT_MAX_CHARS_LIMIT.min, parsed));
}

/** UI-only filter: length is measured on note content (VALUE), not title. */
export function matchesNoteLengthFilter(content, mode, maxChars = DEFAULT_NOTE_SHORT_MAX_CHARS) {
  const length = String(content ?? "").length;
  const threshold = parseNoteShortMaxChars(maxChars);
  if (mode === "short") return length <= threshold;
  if (mode === "long") return length > threshold;
  return true;
}
