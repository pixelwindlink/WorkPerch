import { STORAGE_KEYS } from "./state.js";
import { refreshTabElements, storageGet, storageSet } from "./dom.js";
import { DEFAULT_TAB_ORDER, normalizeTabOrder } from "./tab-order-model.js";

export { DEFAULT_TAB_ORDER, normalizeTabOrder } from "./tab-order-model.js";

export function tabOrderFromNav(nav) {
  if (!nav) return [...DEFAULT_TAB_ORDER];
  return [...nav.querySelectorAll(".tab")].map((tab) => tab.dataset.tab).filter(Boolean);
}

export function applyTabOrder(order, nav = document.querySelector(".tabs")) {
  if (!nav) return [...DEFAULT_TAB_ORDER];
  const normalized = normalizeTabOrder(order);
  const byId = new Map([...nav.querySelectorAll(".tab")].map((tab) => [tab.dataset.tab, tab]));
  for (const id of normalized) {
    const tab = byId.get(id);
    if (tab) nav.append(tab);
  }
  refreshTabElements();
  return normalized;
}

export function persistTabOrder(order) {
  storageSet(STORAGE_KEYS.tabOrder, JSON.stringify(normalizeTabOrder(order)));
}

export function loadTabOrder() {
  return normalizeTabOrder(storageGet(STORAGE_KEYS.tabOrder));
}

function insertTabRelative(dragged, target, after) {
  if (!dragged || !target || dragged === target) return;
  if (after) target.after(dragged);
  else target.before(dragged);
}

export function bindTabDragReorder(nav = document.querySelector(".tabs")) {
  if (!nav) return;
  let suppressClickUntil = 0;

  const suppressClickBriefly = (ms = 280) => {
    suppressClickUntil = Date.now() + ms;
  };

  nav.querySelectorAll(".tab").forEach((tab) => {
    tab.draggable = true;
  });

  nav.addEventListener("dragstart", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab || !nav.contains(tab)) return;
    tab.classList.add("is-dragging");
    tab.setAttribute("aria-grabbed", "true");
    nav.classList.add("is-reordering");
    event.dataTransfer?.setData("text/plain", tab.dataset.tab);
    event.dataTransfer?.setData("text/tab-id", tab.dataset.tab);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  });

  nav.addEventListener("dragend", (event) => {
    const tab = event.target.closest(".tab");
    tab?.classList.remove("is-dragging");
    tab?.removeAttribute("aria-grabbed");
    nav.classList.remove("is-reordering");
    nav.querySelectorAll(".tab.is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    suppressClickBriefly();
  });

  nav.addEventListener("dragover", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab || !nav.contains(tab)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    nav.querySelectorAll(".tab.is-drop-target").forEach((item) => {
      if (item !== tab) item.classList.remove("is-drop-target");
    });
    tab.classList.add("is-drop-target");
  });

  nav.addEventListener("dragleave", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    const related = event.relatedTarget;
    if (related && tab.contains(related)) return;
    tab.classList.remove("is-drop-target");
  });

  nav.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedId = event.dataTransfer?.getData("text/tab-id") || event.dataTransfer?.getData("text/plain");
    const dropTab = event.target.closest(".tab");
    const dragged = draggedId ? nav.querySelector(`.tab[data-tab="${draggedId}"]`) : null;
    if (!dragged || !dropTab) return;
    const rect = dropTab.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    insertTabRelative(dragged, dropTab, after);
    nav.querySelectorAll(".tab.is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    const order = tabOrderFromNav(nav);
    persistTabOrder(order);
    refreshTabElements();
    suppressClickBriefly();
  });

  nav.addEventListener(
    "click",
    (event) => {
      if (Date.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}

export function initTabOrder() {
  const nav = document.querySelector(".tabs");
  if (!nav) return;
  applyTabOrder(loadTabOrder(), nav);
  bindTabDragReorder(nav);
}
