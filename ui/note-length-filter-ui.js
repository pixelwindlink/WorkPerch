import { state } from "./state.js";

export function syncNoteShortThresholdIcon() {
  const input = document.querySelector("#noteShortMaxChars");
  const badge = document.querySelector("#noteShortThresholdIconValue");
  const summary = document.querySelector("#noteShortThresholdFold summary");
  if (!input) return;
  const value = String(state.noteShortMaxChars ?? input.value);
  if (badge) badge.textContent = value;
  input.value = value;
  summary?.setAttribute("aria-label", `短文本字数上限，当前 ${value} 字，点击展开`);
}

export function bindNoteShortThresholdFold() {
  const fold = document.querySelector("#noteShortThresholdFold");
  if (!fold) return;
  syncNoteShortThresholdIcon();
  document.addEventListener("click", (event) => {
    if (!fold.open) return;
    if (fold.contains(event.target)) return;
    fold.open = false;
  });
  fold.addEventListener("toggle", () => {
    if (!fold.open) return;
    requestAnimationFrame(() => document.querySelector("#noteShortMaxChars")?.focus({ preventScroll: true }));
  });
}

export function syncNoteLengthFilterButtons() {
  const root = document.querySelector("#noteLengthFilter");
  if (!root) return;
  for (const button of root.querySelectorAll("[data-length-filter]")) {
    const selected = button.dataset.lengthFilter === state.noteLengthFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  const fold = document.querySelector("#noteShortThresholdFold");
  fold?.classList.toggle("is-short-context", state.noteLengthFilter === "short");
}
