import { alwaysOnTopOpacityDesktopOptions, getPinEffectPreferences } from "./pin-effect-preferences.js";
import { state } from "./state.js";

let bound = false;

function reportPointerInside(inside) {
  if (!state.alwaysOnTop) return;
  window.perchDesktop?.reportWindowPointerInside?.(Boolean(inside));
}

export function syncAlwaysOnTopOpacityPreference() {
  const bridge = window.perchDesktop;
  if (typeof bridge?.setAlwaysOnTopOpacityPreference !== "function") return;
  const options = alwaysOnTopOpacityDesktopOptions(getPinEffectPreferences());
  void bridge.setAlwaysOnTopOpacityPreference(options).catch(() => {});
}

export function bindAlwaysOnTopOpacityBridge() {
  if (bound || typeof window.perchDesktop?.reportWindowPointerInside !== "function") return;
  bound = true;
  const root = document.documentElement;
  root.addEventListener("mouseenter", () => reportPointerInside(true));
  root.addEventListener("mouseleave", () => reportPointerInside(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reportPointerInside(root.matches(":hover"));
    else reportPointerInside(false);
  });
}
