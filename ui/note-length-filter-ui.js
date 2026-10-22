import { state } from "./state.js";

export function syncNoteLengthFilterButtons() {
  const root = document.querySelector("#noteLengthFilter");
  if (!root) return;
  for (const button of root.querySelectorAll("[data-length-filter]")) {
    const selected = button.dataset.lengthFilter === state.noteLengthFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
}
