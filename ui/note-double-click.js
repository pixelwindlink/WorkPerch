/** @param {EventTarget | null} target */
export function noteIdFromDoubleClickTarget(target) {
  if (!target || typeof target.closest !== "function") return null;
  if (target.closest(".note-item-actions")) return null;
  const row = target.closest(".note-item[data-id]");
  return row?.dataset.id || null;
}
