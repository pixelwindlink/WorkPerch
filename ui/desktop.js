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
  const label = state.alwaysOnTop ? "取消全局置顶" : "全局置顶";
  button.setAttribute("aria-label", `${label}；长按约 0.8 秒缩至最小并停靠屏幕右上角`);
  button.dataset.tooltip = label;
  button.innerHTML = icon("pin");
}

export const PARK_CHARGE_SHOW_MS = 210;
export const ALWAYS_ON_TOP_LONG_PRESS_MS = 840;
const PARK_OPERATION_TIMEOUT_MS = 6000;

export async function parkWindowCompactTopRight(fromBounds) {
  if (typeof window.perchDesktop?.parkWindowCompactTopRight !== "function") {
    showToast("仅 Perch Desktop 支持窗口泊车");
    return null;
  }
  try {
    const result = await window.perchDesktop.parkWindowCompactTopRight(
      fromBounds ? { fromBounds } : {},
    );
    renderAlwaysOnTopButton(Boolean(result?.alwaysOnTop));
    storageSet(STORAGE_KEYS.alwaysOnTop, String(Boolean(result?.alwaysOnTop)));
    showToast("窗口已缩至最小并停靠右上角（已置顶）");
    return result;
  } catch {
    showToast("窗口泊车失败");
    return null;
  }
}

export function bindAlwaysOnTopButton() {
  const button = elements.alwaysOnTopButton;
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  let chargeShowTimer = null;
  let parkTimer = null;
  let longPressHandled = false;
  let parkStartBounds = null;
  let pressEpoch = 0;
  let parkInFlight = false;
  let activePointerId = null;

  const cancelParkCharge = () => {
    void window.perchDesktop?.cancelParkCharge?.().catch(() => {});
  };

  const resetPressTimers = () => {
    if (chargeShowTimer) clearTimeout(chargeShowTimer);
    if (parkTimer) clearTimeout(parkTimer);
    chargeShowTimer = null;
    parkTimer = null;
  };

  const releaseAlwaysOnTopButton = () => {
    if (!parkInFlight) button.disabled = false;
  };

  const endPress = ({ cancelCharge = true } = {}) => {
    pressEpoch += 1;
    resetPressTimers();
    if (cancelCharge && !parkInFlight) cancelParkCharge();
    if (!parkInFlight) {
      longPressHandled = false;
      releaseAlwaysOnTopButton();
    }
    activePointerId = null;
  };

  const runParkOperation = (epoch) => {
    longPressHandled = true;
    parkInFlight = true;
    button.disabled = true;
    const bounds = parkStartBounds;
    const timeout = setTimeout(() => {
      parkInFlight = false;
      releaseAlwaysOnTopButton();
      longPressHandled = false;
    }, PARK_OPERATION_TIMEOUT_MS);
    void parkWindowCompactTopRight(bounds).finally(() => {
      clearTimeout(timeout);
      parkInFlight = false;
      parkStartBounds = null;
      releaseAlwaysOnTopButton();
      if (epoch === pressEpoch) longPressHandled = false;
    });
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || button.disabled || parkInFlight) return;
    endPress();
    const epoch = pressEpoch;
    longPressHandled = false;
    parkStartBounds = null;
    activePointerId = event.pointerId;
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      activePointerId = null;
    }
    void window.perchDesktop?.getWindowBounds?.().then((bounds) => {
      if (epoch !== pressEpoch) return;
      if (bounds && typeof bounds === "object") parkStartBounds = bounds;
    }).catch(() => {});
    chargeShowTimer = setTimeout(() => {
      if (epoch !== pressEpoch) return;
      chargeShowTimer = null;
      void window.perchDesktop?.startParkCharge?.().then((bounds) => {
        if (epoch !== pressEpoch) return;
        if (bounds && typeof bounds === "object") parkStartBounds = bounds;
      }).catch(() => {});
    }, PARK_CHARGE_SHOW_MS);
    parkTimer = setTimeout(() => {
      if (epoch !== pressEpoch) return;
      parkTimer = null;
      runParkOperation(epoch);
    }, ALWAYS_ON_TOP_LONG_PRESS_MS);
  });

  const onPointerRelease = (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    if (activePointerId !== null) {
      try {
        button.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    endPress();
  };

  button.addEventListener("pointerup", onPointerRelease);
  button.addEventListener("pointercancel", onPointerRelease);
  button.addEventListener("click", async (event) => {
    if (longPressHandled || parkInFlight) {
      event.preventDefault();
      longPressHandled = false;
      return;
    }
    button.disabled = true;
    try {
      await setAlwaysOnTopPreference(!state.alwaysOnTop);
    } finally {
      releaseAlwaysOnTopButton();
    }
  });
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
    bindAlwaysOnTopButton();
  } catch {
    elements.alwaysOnTopButton.hidden = true;
  }
  const presetsButton = document.querySelector("#windowPresetsButton");
  if (presetsButton && typeof bridge?.externalWindows?.list === "function") {
    presetsButton.hidden = false;
    presetsButton.innerHTML = icon("settings");
    presetsButton.dataset.label = "外窗预设";
  }
}
