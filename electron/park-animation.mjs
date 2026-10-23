import { boundsToLocal, unionBounds } from "./park-frame-geometry.mjs";
import {
  handoffChargeOverlayToFrame,
  raiseChargeOverlayForFrame,
} from "./park-charge-overlay.mjs";
import { createParkOverlayBrowserWindow, loadParkOverlayHtml } from "./park-overlay-window.mjs";
import {
  PARK_FRAME_DURATION_MS,
  PARK_FRAME_FINISH_PAD_MS,
  PARK_FRAME_TRAVEL_EASING,
  parkFrameKeyframes,
  parkFrameLayerCss,
  parkFrameShellKeyframes,
  parkFrameShellLayerCss,
  parkOverlayBaseCss,
} from "./park-visual-style.mjs";

export const PARK_FRAME_ANIMATION_MS = PARK_FRAME_DURATION_MS;

function buildParkFrameHtml(from, to, durationMs) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${parkOverlayBaseCss()}
${parkFrameLayerCss(durationMs)}
${parkFrameKeyframes(from, to)}
</style>
</head>
<body><div id="box" aria-hidden="true"></div></body>
</html>`;
}

function closeOverlayWhenDone(overlay, durationMs, finishPadMs) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (!overlay.isDestroyed()) overlay.close();
      resolve();
    };
    setTimeout(finish, durationMs + finishPadMs);
  });
}

async function playParkFrameOnChargeOverlay(overlay, from, to, { durationMs = PARK_FRAME_ANIMATION_MS } = {}) {
  const origin = unionBounds(from, to);
  if (!overlay.isDestroyed()) overlay.setBounds(origin);
  const fromLocal = boundsToLocal(from, origin);
  const toLocal = boundsToLocal(to, origin);
  const injectedCss = `${parkFrameShellLayerCss(durationMs)}\n${parkFrameShellKeyframes(fromLocal, toLocal)}`;
  const easing = PARK_FRAME_TRAVEL_EASING;

  await raiseChargeOverlayForFrame(overlay);

  await overlay.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const shell = document.getElementById("shell");
      if (!shell) {
        resolve(false);
        return;
      }
      shell.innerHTML = "";
      shell.classList.add("is-frame");
      shell.style.animation = "none";
      shell.style.left = ${fromLocal.x} + "px";
      shell.style.top = ${fromLocal.y} + "px";
      shell.style.width = ${fromLocal.width} + "px";
      shell.style.height = ${fromLocal.height} + "px";
      const style = document.getElementById("park-frame-style") || document.createElement("style");
      style.id = "park-frame-style";
      style.textContent = ${JSON.stringify(injectedCss)};
      document.head.appendChild(style);
      void shell.offsetWidth;
      shell.style.animation = "park-frame-shell ${durationMs}ms ${easing} forwards";
      const finish = () => resolve(true);
      shell.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, ${durationMs + 48});
    });
  `);

  return closeOverlayWhenDone(overlay, durationMs, PARK_FRAME_FINISH_PAD_MS);
}

export function showParkFrameAnimation(from, to, { durationMs = PARK_FRAME_ANIMATION_MS } = {}) {
  const chargeOverlay = handoffChargeOverlayToFrame();
  if (chargeOverlay) {
    return playParkFrameOnChargeOverlay(chargeOverlay, from, to, { durationMs });
  }

  const origin = unionBounds(from, to);
  const fromLocal = boundsToLocal(from, origin);
  const toLocal = boundsToLocal(to, origin);
  const html = buildParkFrameHtml(fromLocal, toLocal, durationMs);

  return new Promise((resolve) => {
    const overlay = createParkOverlayBrowserWindow(origin);
    let finished = false;
    let finishTimer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (finishTimer) clearTimeout(finishTimer);
      if (!overlay.isDestroyed()) overlay.close();
      resolve();
    };
    loadParkOverlayHtml(overlay, html)
      .then(() => {
        finishTimer = setTimeout(finish, durationMs + PARK_FRAME_FINISH_PAD_MS);
      })
      .catch(finish);
  });
}
