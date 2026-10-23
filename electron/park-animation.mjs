import { boundsToLocal, unionBounds } from "./park-frame-geometry.mjs";
import {
  handoffChargeOverlayToFrame,
  raiseChargeOverlayForFrame,
} from "./park-charge-overlay.mjs";
import { PARK_FRAME_FADE_OUT_MS } from "./park-charge-timing.mjs";
import { normalizeParkTheme } from "./park-theme-colors.mjs";
import {
  createParkOverlayBrowserWindow,
  loadParkOverlayHtml,
  readOverlayScreenBounds,
} from "./park-overlay-window.mjs";
import {
  PARK_FRAME_DURATION_MS,
  PARK_FRAME_TRAVEL_EASING,
  parkFlightBodyHtml,
  parkFlightFadeOutKeyframes,
  parkFlightFrozenCss,
  parkFlightShellKeyframes,
  parkOverlayBaseCss,
} from "./park-visual-style.mjs";

export const PARK_FRAME_ANIMATION_MS = PARK_FRAME_DURATION_MS;
export { PARK_FRAME_FADE_OUT_MS };

function buildParkFlightHtml(from, to, durationMs, theme) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${parkOverlayBaseCss()}
${parkFlightFrozenCss(theme)}
${parkFlightFadeOutKeyframes()}
${parkFlightShellKeyframes(from, to)}
#shell.is-park-flight {
  animation: park-flight ${durationMs}ms ${PARK_FRAME_TRAVEL_EASING} forwards;
}
</style>
</head>
<body>${parkFlightBodyHtml()}</body>
</html>`;
}

async function fadeOutParkOverlay(overlay, fadeMs = PARK_FRAME_FADE_OUT_MS) {
  if (!overlay || overlay.isDestroyed()) return;
  try {
    await overlay.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const fade = document.getElementById("fade");
        const shell = document.getElementById("shell");
        const target = fade || shell;
        if (!target) {
          resolve();
          return;
        }
        target.style.animation = "park-flight-fade-out ${fadeMs}ms ease-out forwards";
        const done = () => resolve();
        target.addEventListener("animationend", done, { once: true });
        setTimeout(done, ${fadeMs + 32});
      });
    `);
  } catch {
    /* overlay gone */
  }
}

async function waitForParkFlightEnd(overlay, durationMs) {
  if (!overlay || overlay.isDestroyed()) return;
  try {
    await overlay.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const shell = document.getElementById("shell");
        if (!shell) {
          resolve();
          return;
        }
        const done = () => resolve();
        shell.addEventListener("animationend", done, { once: true });
        setTimeout(done, ${durationMs + 48});
      });
    `);
  } catch {
    /* overlay gone */
  }
}

async function closeOverlayAfterParkFlight(overlay, flightDurationMs, fadeMs = PARK_FRAME_FADE_OUT_MS) {
  await waitForParkFlightEnd(overlay, flightDurationMs);
  await fadeOutParkOverlay(overlay, fadeMs);
  if (!overlay.isDestroyed()) overlay.close();
}

async function concealParkOverlayShell(overlay) {
  if (!overlay || overlay.isDestroyed()) return;
  try {
    await overlay.webContents.executeJavaScript(`
      (() => {
        const shell = document.getElementById("shell");
        if (shell) shell.style.visibility = "hidden";
      })();
    `);
  } catch {
    /* empty or loading */
  }
}

async function localizeBoundsInOverlay(overlay, from, to, { concealDuringResize = false } = {}) {
  const origin = unionBounds(from, to);
  if (concealDuringResize) await concealParkOverlayShell(overlay);
  if (!overlay.isDestroyed()) overlay.setBounds(origin);
  const overlayOrigin = await readOverlayScreenBounds(overlay, origin);
  return {
    fromLocal: boundsToLocal(from, overlayOrigin),
    toLocal: boundsToLocal(to, overlayOrigin),
  };
}

async function playParkFlightOnChargeOverlay(
  overlay,
  from,
  to,
  { durationMs = PARK_FRAME_ANIMATION_MS, fadeOutMs = PARK_FRAME_FADE_OUT_MS, theme = null } = {},
) {
  const resolvedTheme = normalizeParkTheme(theme);
  const { fromLocal, toLocal } = await localizeBoundsInOverlay(overlay, from, to, {
    concealDuringResize: true,
  });
  const injectedCss = `${parkFlightFrozenCss(resolvedTheme)}\n${parkFlightFadeOutKeyframes()}\n${parkFlightShellKeyframes(fromLocal, toLocal)}`;
  const easing = PARK_FRAME_TRAVEL_EASING;

  await raiseChargeOverlayForFrame(overlay);

  await overlay.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const shell = document.getElementById("shell");
      if (!shell) {
        resolve(false);
        return;
      }
      shell.classList.add("is-park-flight");
      const fade = document.getElementById("fade");
      const master = document.getElementById("master");
      const halo = document.getElementById("halo");
      if (fade) {
        fade.style.animation = "none";
        fade.style.opacity = "1";
      }
      if (master) {
        master.style.animation = "none";
        master.style.opacity = "0.5";
      }
      if (halo) {
        halo.style.animation = "none";
        halo.style.opacity = "0.48";
        halo.style.filter = "blur(9px)";
        halo.style.transform = "scale(1)";
      }
      shell.style.animation = "none";
      shell.style.left = ${fromLocal.x} + "px";
      shell.style.top = ${fromLocal.y} + "px";
      shell.style.width = ${fromLocal.width} + "px";
      shell.style.height = ${fromLocal.height} + "px";
      shell.style.visibility = "visible";
      const style = document.getElementById("park-flight-style") || document.createElement("style");
      style.id = "park-flight-style";
      style.textContent = ${JSON.stringify(injectedCss)};
      document.head.appendChild(style);
      void shell.offsetWidth;
      shell.style.animation = "park-flight ${durationMs}ms ${easing} forwards";
      const finish = () => resolve(true);
      shell.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, ${durationMs + 48});
    });
  `);

  await fadeOutParkOverlay(overlay, fadeOutMs);
  if (!overlay.isDestroyed()) overlay.close();
}

export function showParkFrameAnimation(
  from,
  to,
  { durationMs = PARK_FRAME_ANIMATION_MS, fadeOutMs = PARK_FRAME_FADE_OUT_MS, theme = null } = {},
) {
  const resolvedTheme = normalizeParkTheme(theme);
  const chargeOverlay = handoffChargeOverlayToFrame();
  if (chargeOverlay) {
    return playParkFlightOnChargeOverlay(chargeOverlay, from, to, { durationMs, fadeOutMs, theme: resolvedTheme });
  }

  const origin = unionBounds(from, to);
  const overlay = createParkOverlayBrowserWindow(origin);

  return localizeBoundsInOverlay(overlay, from, to)
    .then(async ({ fromLocal, toLocal }) => {
      const html = buildParkFlightHtml(fromLocal, toLocal, durationMs, resolvedTheme);
      try {
        await loadParkOverlayHtml(overlay, html);
        await closeOverlayAfterParkFlight(overlay, durationMs, fadeOutMs);
      } catch {
        if (!overlay.isDestroyed()) overlay.close();
      }
    });
}
