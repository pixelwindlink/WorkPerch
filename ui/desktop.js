import { STORAGE_KEYS, state } from "./state.js";
import { elements, storageGet, storageSet, icon, showToast, finderFailureMessage } from "./dom.js";
import { recordUsage } from "./engine-client.js";

export async function openLocalPathInFinder(localPath, label, usage = null) {
  const openPath = window.perchDesktop?.openPathInFinder;
  if (typeof openPath !== "function") {
    showToast("普通浏览器不能打开本机访达，请使用 Perch 桌面应用", 2800);
    return false;
  }
  try {
    const result = await openPath(localPath);
    showToast(result?.kind === "directory" ? `已在访达打开：${label}` : `已在访达定位：${label}`);
    if (usage) await recordUsage(usage.kind, usage.id);
    return true;
  } catch (error) {
    showToast(`访达打开失败：${finderFailureMessage(error)}`, 3000);
    return false;
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storageSet(STORAGE_KEYS.theme, theme);
  document.querySelector("#themeButton").innerHTML = icon(theme === "light" ? "moon" : "sun");
}

export function renderAlwaysOnTopButton(active) {
  const button = elements.alwaysOnTopButton;
  state.alwaysOnTop = Boolean(active);
  button.hidden = false;
  button.classList.toggle("is-active", state.alwaysOnTop);
  button.setAttribute("aria-pressed", String(state.alwaysOnTop));
  button.setAttribute("aria-label", state.alwaysOnTop ? "取消全局置顶" : "全局置顶");
  button.dataset.label = state.alwaysOnTop ? "取消置顶" : "全局置顶";
  button.title = state.alwaysOnTop ? "取消全局置顶" : "全局置顶";
  button.innerHTML = icon("pin");
}

export async function setAlwaysOnTopPreference(enabled, { persist = true, notify = true } = {}) {
  try {
    const active = await window.perchDesktop.setAlwaysOnTop(Boolean(enabled));
    renderAlwaysOnTopButton(active);
    if (persist) storageSet(STORAGE_KEYS.alwaysOnTop, String(active));
    if (notify) showToast(active ? "窗口已全局置顶" : "窗口已取消全局置顶");
    return active;
  } catch {
    showToast("无法切换窗口置顶状态");
    return state.alwaysOnTop;
  }
}

export async function initializeDesktopWindowControls() {
  const bridge = window.perchDesktop;
  if (typeof bridge?.getAlwaysOnTop !== "function" || typeof bridge?.setAlwaysOnTop !== "function") return;
  document.documentElement.dataset.desktop = "true";
  try {
    let active = Boolean(await bridge.getAlwaysOnTop());
    const preferred = storageGet(STORAGE_KEYS.alwaysOnTop);
    if (preferred === "true" && !active) active = await setAlwaysOnTopPreference(true, { persist: false, notify: false });
    if (preferred === "false" && active) active = await setAlwaysOnTopPreference(false, { persist: false, notify: false });
    renderAlwaysOnTopButton(active);
  } catch {
    elements.alwaysOnTopButton.hidden = true;
  }
}
