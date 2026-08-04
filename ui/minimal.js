import { STORAGE_KEYS, state } from "./state.js";
import { storageSet, icon } from "./dom.js";
import { switchTab } from "./engine-client.js";
import { syncHeaderHeight } from "./header-layout.js";
import { renderPaths } from "./render-paths.js";

export function applyMinimalMode(enabled, { persist = true, render = true } = {}) {
  state.minimalMode = Boolean(enabled);
  document.documentElement.dataset.minimal = state.minimalMode ? "true" : "false";
  const button = document.querySelector("#minimalModeButton");
  if (button) {
    button.classList.toggle("is-active", state.minimalMode);
    button.setAttribute("aria-pressed", String(state.minimalMode));
    const label = state.minimalMode ? "退出极简模式" : "极简模式";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon("minimal");
  }
  if (persist) storageSet(STORAGE_KEYS.minimalMode, String(state.minimalMode));
  if (state.minimalMode) switchTab("paths", false);
  if (render) renderPaths();
  syncHeaderHeight();
}

export function toggleMinimalMode() {
  applyMinimalMode(!state.minimalMode);
}
