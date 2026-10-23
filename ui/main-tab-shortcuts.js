export const MAIN_PANEL_TABS = Object.freeze(["paths", "notes", "clipboard"]);

export function orderedMainPanelTabs(nav = document?.querySelector?.(".tabs")) {
  if (!nav) return [...MAIN_PANEL_TABS];
  const tabs = [...nav.querySelectorAll(".tab")].map((tab) => tab.dataset.tab).filter((id) => MAIN_PANEL_TABS.includes(id));
  return tabs.length === MAIN_PANEL_TABS.length ? tabs : [...MAIN_PANEL_TABS];
}

export function nextMainPanelTab(currentTab, orderedTabs = MAIN_PANEL_TABS) {
  const tabs = orderedTabs.length ? orderedTabs : [...MAIN_PANEL_TABS];
  const current = tabs.includes(currentTab) ? currentTab : tabs[0];
  const index = tabs.indexOf(current);
  return tabs[(index + 1) % tabs.length];
}

export function shouldSwitchMainPanelOnTab(event) {
  if (typeof document !== "undefined" && document.documentElement.dataset.minimal === "true") return false;
  if (event.key !== "Tab" || event.isComposing) return false;
  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  const element = event.target;
  if (!element || typeof element.closest !== "function") return true;
  if (element.closest("dialog[open], #summonOverlay")) return false;
  if (element.closest("textarea")) return false;
  if (element.closest("#editNoteForm, #editPathForm, #editProjectForm, #dropBatchForm")) return false;
  if (element.closest(".guide-mask, #guideOverlay")) return false;
  return true;
}
