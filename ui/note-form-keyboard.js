export function shouldInsertNoteValueNewline(event) {
  if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return false;
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return false;
  const textarea = event.target?.closest?.("#editNoteValue");
  return Boolean(textarea && !textarea.disabled && !textarea.readOnly);
}

export function shouldSubmitNoteFormOnEnter(event) {
  if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  const textarea = event.target?.closest?.("#editNoteValue");
  return Boolean(textarea && !textarea.disabled && !textarea.readOnly);
}

export function insertTextareaNewline(textarea) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const { value } = textarea;
  textarea.value = `${value.slice(0, start)}\n${value.slice(end)}`;
  const caret = start + 1;
  textarea.selectionStart = caret;
  textarea.selectionEnd = caret;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
