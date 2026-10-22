/** 自动 KEY：纯数字自增（1、2、3…），与手写标题并存。 */

export function isNoteTitleTaken(notes, title, { exceptId } = {}) {
  const normalized = String(title ?? "").trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return false;
  return notes.some((note) => {
    if (exceptId && note.id === exceptId) return false;
    return String(note.title ?? "").trim().toLocaleLowerCase("zh-CN") === normalized;
  });
}

export function allocateAutoNoteTitle(notes, { exceptId } = {}) {
  let maxSerial = 0;
  for (const note of notes) {
    if (exceptId && note.id === exceptId) continue;
    const match = String(note.title ?? "").trim().match(/^(\d+)$/);
    if (match) maxSerial = Math.max(maxSerial, Number(match[1]));
  }
  let candidate = maxSerial + 1;
  while (isNoteTitleTaken(notes, String(candidate), { exceptId })) candidate += 1;
  return String(candidate);
}

export function resolveNoteTitleForSave(rawTitle, notes, { exceptId } = {}) {
  const title = String(rawTitle ?? "").trim();
  if (title) return title;
  return allocateAutoNoteTitle(notes, { exceptId });
}
