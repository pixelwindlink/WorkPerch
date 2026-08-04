const ENTER_SUBMIT_FORMS = [
  ["#editPathForm", "#pathDialogSubmit"],
  ["#editNoteForm", "#noteDialogSubmit"],
  ["#editProjectForm", "#projectDialogSubmit"],
  ["#launchProjectForm", "#launchProjectSubmit"],
  ["#groupRegistryForm", "#groupRegistrySubmit"],
];

const SEARCH_INPUTS = ["#pathSearch", "#projectSearch", "#noteSearch"];

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
  for (const [form, submit] of ENTER_SUBMIT_FORMS) bindPrimaryEnter(form, submit);
  for (const selector of SEARCH_INPUTS) bindSearchEscape(selector);
  bindHorizontalControl(".tabs", ".tab");
  bindHorizontalControl("#projectFilters", "[data-filter]");
  bindHorizontalControl("#groupRegistryFilter", "[data-tag-filter]");
  bindHorizontalControl("#groupColorPalette", "[data-group-color]");
}
