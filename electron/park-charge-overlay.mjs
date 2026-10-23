import { chargeOverlayBounds, PARK_CHARGE_GLOW_PAD } from "./park-frame-geometry.mjs";
import {
  PARK_CHARGE_COLLAPSE_MS,
  PARK_CHARGE_APPEAR_MS,
  PARK_CHARGE_EXPAND_MS,
  PARK_CHARGE_MASTER_FADE_MS,
} from "./park-charge-timing.mjs";
import {
  createParkOverlayBrowserWindow,
  loadParkOverlayHtml,
  revealParkOverlay,
} from "./park-overlay-window.mjs";
import { normalizeParkTheme } from "./park-theme-colors.mjs";
import {
  parkChargeCollapseKeyframes,
  parkChargeKeyframes,
  parkChargeLayerCss,
  parkChargeMasterKeyframes,
  parkOverlayBaseCss,
} from "./park-visual-style.mjs";

export { PARK_CHARGE_GLOW_PAD, chargeOverlayBounds };
export {
  PARK_CHARGE_APPEAR_MS,
  PARK_CHARGE_COLLAPSE_MS,
  PARK_CHARGE_EXPAND_MS,
  PARK_CHARGE_MASTER_FADE_MS,
  PARK_CHARGE_SHOW_DELAY_MS,
  PARK_PRESS_PARK_MS,
} from "./park-charge-timing.mjs";

function buildParkChargeHtml(localWindow, durationMs, glowPad, masterFadeDurationMs, theme) {
  const { x, y, width, height } = localWindow;
  const end = { x: 0, y: 0, width: width + glowPad * 2, height: height + glowPad * 2 };
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${parkOverlayBaseCss()}
${parkChargeLayerCss(durationMs, masterFadeDurationMs, theme, PARK_CHARGE_APPEAR_MS)}
${parkChargeKeyframes(end, { x, y, width, height })}
${parkChargeMasterKeyframes(durationMs, masterFadeDurationMs)}
${parkChargeCollapseKeyframes({ x, y, width, height }, end)}
</style>
</head>
<body>
  <div id="shell" aria-hidden="true">
    <div id="fade">
      <div id="master">
        <div id="halo"></div>
        <div id="ring"></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

let activeChargeOverlay = null;
let chargeSession = 0;

function closeActiveChargeOverlay() {
  if (!activeChargeOverlay) return;
  if (!activeChargeOverlay.isDestroyed()) activeChargeOverlay.close();
  activeChargeOverlay = null;
}

export function getActiveParkChargeOverlay() {
  return activeChargeOverlay && !activeChargeOverlay.isDestroyed() ? activeChargeOverlay : null;
}

export function cancelParkChargeOverlay() {
  chargeSession += 1;
  closeActiveChargeOverlay();
}

export async function collapseParkChargeOverlay(durationMs = PARK_CHARGE_COLLAPSE_MS) {
  const overlay = getActiveParkChargeOverlay();
  if (!overlay) return false;
  try {
    await overlay.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const shell = document.getElementById("shell");
        if (!shell) {
          resolve(false);
          return;
        }
        const halo = document.getElementById("halo");
        const master = document.getElementById("master");
        if (halo) halo.style.display = "none";
        if (master) {
          master.style.animation = "none";
          master.style.opacity = "1";
        }
        shell.style.animation = "park-collapse ${durationMs}ms cubic-bezier(0.55, 0, 1, 0.42) forwards";
        const finish = () => resolve(true);
        shell.addEventListener("animationend", finish, { once: true });
        setTimeout(finish, ${durationMs + 48});
      });
    `);
    return true;
  } catch {
    return false;
  }
}

export function handoffChargeOverlayToFrame() {
  const overlay = getActiveParkChargeOverlay();
  if (!overlay) return null;
  activeChargeOverlay = null;
  return overlay;
}

export async function startParkChargeOverlay(
  windowBounds,
  {
    ownerWindow = null,
    theme = null,
    durationMs = PARK_CHARGE_EXPAND_MS,
    masterFadeDurationMs = PARK_CHARGE_MASTER_FADE_MS,
  } = {},
) {
  const session = ++chargeSession;
  closeActiveChargeOverlay();
  const overlayScreen = chargeOverlayBounds(windowBounds);
  const localWindow = {
    x: PARK_CHARGE_GLOW_PAD,
    y: PARK_CHARGE_GLOW_PAD,
    width: windowBounds.width,
    height: windowBounds.height,
  };
  const resolvedTheme = normalizeParkTheme(theme);
  const html = buildParkChargeHtml(localWindow, durationMs, PARK_CHARGE_GLOW_PAD, masterFadeDurationMs, resolvedTheme);
  const overlay = createParkOverlayBrowserWindow(overlayScreen, { stacking: "above" });
  activeChargeOverlay = overlay;
  overlay.once("closed", () => {
    if (activeChargeOverlay === overlay) activeChargeOverlay = null;
  });
  await loadParkOverlayHtml(overlay, html, { stacking: "above", ownerWindow });
  if (session !== chargeSession) {
    closeActiveChargeOverlay();
    return null;
  }
  return overlay;
}

export async function raiseChargeOverlayForFrame(overlay) {
  if (!overlay || overlay.isDestroyed()) return;
  revealParkOverlay(overlay, { stacking: "above" });
}
