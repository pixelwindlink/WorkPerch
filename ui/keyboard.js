const ENTER_SUBMIT_FORMS = [
  ["#editPathForm", "#pathDialogSubmit"],
  ["#editNoteForm", "#noteDialogSubmit"],
  ["#editProjectForm", "#projectDialogSubmit"],
  ["#launchProjectForm", "#launchProjectSubmit"],
  ["#groupRegistryForm", "#groupRegistrySubmit"],
];

import { shouldCycleNoteLengthFilterOnTab } from "./note-length-filter.js";
import { shouldCreateNoteFromPaste } from "./note-paste-create.js";
import { shouldOpenAddNoteOnEnter } from "./note-board-shortcuts.js";

const SEARCH_INPUTS = ["#pathSearch", "#projectSearch", "#noteSearch"];

const STATIC_KEY_LABELS = [
  ["#editPathForm .dialog-actions button[value='cancel']", "取消", "Esc"],
  ["#groupRegistryForm .dialog-actions button[value='cancel']", "完成", "Esc"],
  ["#editNoteForm .dialog-actions button[value='cancel']", "取消", "Esc"],
  ["#dropBatchForm .dialog-actions button[value='cancel']", "取消", "Esc"],
  ["#editProjectForm .dialog-actions button[value='cancel']", "取消", "Esc"],
  ["#launchProjectForm .dialog-actions button[value='cancel']", "取消", "Esc"],
  ["#launchProjectSubmit", "保存启动配置", "Enter"],
  ["#legacyMigrationForm .dialog-actions button[value='cancel']", "稍后", "Esc"],
];

export function setButtonKeyboardLabel(target, label, key) {
  const button = typeof target === "string" ? document.querySelector(target) : target;
  if (!button) return;
  const hint = button.ownerDocument.createElement("span");
  hint.className = "button-key-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = `(${key})`;
  button.replaceChildren(button.ownerDocument.createTextNode(label), hint);
  button.setAttribute("aria-label", `${label}，键盘 ${key}`);
}

export function isPlainEnterOnSingleLineInput(event) {
  if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  const input = event.target.closest("input");
  if (!input || input.disabled || input.readOnly) return false;
  return !["button", "submit", "reset", "checkbox", "radio", "file", "color", "range", "hidden"].includes(input.type);
}

function bindPrimaryEnter(formSelector, submitSelector) {
  const form = document.querySelector(formSelector);
  const submit = document.querySelector(submitSelector);
  if (!form || !submit) return;
  form.addEventListener("keydown", (event) => {
    if (!isPlainEnterOnSingleLineInput(event) || event.target.form !== form) return;
    event.preventDefault();
    if (!submit.disabled) submit.click();
  });
}

function bindSearchEscape(selector) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !input.value) return;
    event.preventDefault();
    event.stopPropagation();
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function horizontalKeyTarget(buttons, current, key) {
  const index = Math.max(0, buttons.indexOf(current));
  if (key === "Home") return buttons[0];
  if (key === "End") return buttons.at(-1);
  if (key === "ArrowRight") return buttons[(index + 1) % buttons.length];
  if (key === "ArrowLeft") return buttons[(index - 1 + buttons.length) % buttons.length];
  return null;
}

function bindNotesEnterAdd() {
  document.addEventListener("keydown", (event) => {
    if (!shouldOpenAddNoteOnEnter(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void import("./dialogs-note.js").then(({ openNoteEditor }) => openNoteEditor());
  }, true);
}

function bindNotePasteCreate() {
  document.addEventListener("keydown", async (event) => {
    const notesActive = document.querySelector("#notesPanel")?.classList.contains("is-active");
    if (!shouldCreateNoteFromPaste(event, notesActive ? "notes" : "")) return;
    event.preventDefault();
    const { createNoteFromClipboard } = await import("./dialogs-note.js");
    await createNoteFromClipboard();
  });
}

function bindNoteLengthFilterTabCycle() {
  document.addEventListener("keydown", (event) => {
    const notesActive = document.querySelector("#notesPanel")?.classList.contains("is-active");
    if (!shouldCycleNoteLengthFilterOnTab(event, notesActive ? "notes" : "")) return;
    event.preventDefault();
    event.stopPropagation();
    void (async () => {
      const [{ cycleNoteLengthFilter }, { renderNotes }, { syncNoteLengthFilterButtons }] = await Promise.all([
        import("./note-length-preferences.js"),
        import("./render-notes.js"),
        import("./note-length-filter-ui.js"),
      ]);
      cycleNoteLengthFilter(event.shiftKey ? -1 : 1);
      syncNoteLengthFilterButtons();
      renderNotes();
      document.querySelector("#noteLengthFilter [data-length-filter].is-active")?.focus({ preventScroll: true });
    })();
  }, true);
}

function bindHorizontalControl(rootSelector, buttonSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.addEventListener("keydown", (event) => {
    if (!event.target.closest(buttonSelector)) return;
    const buttons = [...root.querySelectorAll(buttonSelector)].filter((button) => !button.disabled && button.offsetParent !== null);
    if (!buttons.length) return;
    const target = horizontalKeyTarget(buttons, event.target.closest(buttonSelector), event.key);
    if (!target) return;
    event.preventDefault();
    target.focus();
    target.click();
  });
}

export function bindKeyboardInteractions() {
  for (const [selector, label, key] of STATIC_KEY_LABELS) setButtonKeyboardLabel(selector, label, key);
  for (const [form, submit] of ENTER_SUBMIT_FORMS) bindPrimaryEnter(form, submit);
  for (const selector of SEARCH_INPUTS) bindSearchEscape(selector);
  bindHorizontalControl(".tabs", ".tab");
  bindHorizontalControl("#projectFilters", "[data-filter]");
  bindHorizontalControl("#groupRegistryFilter", "[data-tag-filter]");
  bindHorizontalControl("#groupColorPalette", "[data-group-color]");
  bindHorizontalControl("#noteLengthFilter", "[data-length-filter]");
  bindNoteLengthFilterTabCycle();
  bindNotePasteCreate();
  bindNotesEnterAdd();
}
