import { screen } from "electron";
import {
  ALWAYS_ON_TOP_OPACITY_TRANSITION_MS,
  clampAlwaysOnTopTransparencyPercent,
  interpolateWindowOpacity,
  resolveAlwaysOnTopWindowOpacity,
} from "../lib/always-on-top-opacity.mjs";

function isCursorInsideWindow(window) {
  if (!window || window.isDestroyed()) return false;
  const { x, y } = screen.getCursorScreenPoint();
  const bounds = window.getBounds();
  return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height;
}

function createOpacityAnimator(window, durationMs = ALWAYS_ON_TOP_OPACITY_TRANSITION_MS) {
  let timer = null;

  const cancel = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const snapTo = (opacity) => {
    cancel();
    if (!window.isDestroyed()) window.setOpacity(opacity);
  };

  const animateTo = (targetOpacity) => {
    cancel();
    if (window.isDestroyed()) return;
    const target = Math.min(1, Math.max(0.15, targetOpacity));
    const start = window.getOpacity();
    if (Math.abs(start - target) < 0.008) {
      window.setOpacity(target);
      return;
    }
    const began = Date.now();
    timer = setInterval(() => {
      if (window.isDestroyed()) {
        cancel();
        return;
      }
      const progress = (Date.now() - began) / durationMs;
      if (progress >= 1) {
        window.setOpacity(target);
        cancel();
        return;
      }
      window.setOpacity(interpolateWindowOpacity(start, target, progress));
    }, 16);
  };

  return { animateTo, snapTo, cancel };
}

export function createAlwaysOnTopOpacityController(window) {
  let transparencyPercent = 0;
  let alwaysOnTop = false;
  let focused = window.isFocused();
  let pointerInside = false;
  const animator = createOpacityAnimator(window);

  const targetOpacity = () => resolveAlwaysOnTopWindowOpacity({
    alwaysOnTop,
    focused,
    pointerInside,
    transparencyPercent,
  });

  const apply = ({ animate = true } = {}) => {
    if (window.isDestroyed()) return;
    const opacity = targetOpacity();
    if (!animate || transparencyPercent <= 0) {
      animator.snapTo(opacity);
      return;
    }
    animator.animateTo(opacity);
  };

  const onFocus = () => {
    focused = true;
    apply();
  };

  const onBlur = () => {
    focused = false;
    pointerInside = isCursorInsideWindow(window);
    apply();
  };

  window.on("focus", onFocus);
  window.on("blur", onBlur);

  return {
    setTransparencyPercent(value) {
      transparencyPercent = clampAlwaysOnTopTransparencyPercent(value, 0);
      apply({ animate: transparencyPercent > 0 });
    },
    setAlwaysOnTop(enabled) {
      alwaysOnTop = Boolean(enabled);
      if (!alwaysOnTop) {
        pointerInside = false;
        animator.animateTo(1);
        return;
      }
      apply();
    },
    setPointerInside(inside) {
      if (!alwaysOnTop) return;
      pointerInside = Boolean(inside);
      apply();
    },
    dispose() {
      animator.cancel();
      window.removeListener("focus", onFocus);
      window.removeListener("blur", onBlur);
    },
  };
}
