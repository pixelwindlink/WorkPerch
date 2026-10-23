import { BrowserWindow } from "electron";

export function createParkOverlayBrowserWindow(screenBounds, { stacking = "above" } = {}) {
  const belowOwner = stacking === "below";
  const overlay = new BrowserWindow({
    x: screenBounds.x,
    y: screenBounds.y,
    width: screenBounds.width,
    height: screenBounds.height,
    frame: false,
    transparent: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    show: false,
    alwaysOnTop: !belowOwner,
    backgroundColor: "#00000000",
    paintWhenInitiallyHidden: true,
    ...(process.platform === "darwin" && !belowOwner
      ? { type: "panel", roundedCorners: false, acceptFirstMouse: true }
      : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  return overlay;
}

export function raiseOwnerAboveOverlay(ownerWindow) {
  if (!ownerWindow || ownerWindow.isDestroyed()) return;
  if (!ownerWindow.isVisible()) ownerWindow.show();
  ownerWindow.moveTop();
  if (typeof ownerWindow.focus === "function") ownerWindow.focus();
}

export function revealParkOverlay(overlay, { stacking = "above", ownerWindow = null } = {}) {
  if (overlay.isDestroyed()) return;
  overlay.setIgnoreMouseEvents(true, { forward: true });
  if (stacking === "below") {
    overlay.setAlwaysOnTop(false);
    if (process.platform === "darwin" && typeof overlay.showInactive === "function") {
      overlay.showInactive();
    } else {
      overlay.show();
    }
    raiseOwnerAboveOverlay(ownerWindow);
    return;
  }
  overlay.setAlwaysOnTop(true, process.platform === "darwin" ? "screen-saver" : "pop-up-menu");
  if (process.platform === "darwin" && typeof overlay.showInactive === "function") {
    overlay.showInactive();
  } else {
    overlay.show();
  }
}

export function loadParkOverlayHtml(overlay, html, revealOptions = {}) {
  return new Promise((resolve, reject) => {
    if (overlay.isDestroyed()) {
      reject(new Error("overlay destroyed"));
      return;
    }
    let revealed = false;
    const reveal = () => {
      if (revealed || overlay.isDestroyed()) return;
      revealed = true;
      revealParkOverlay(overlay, revealOptions);
      resolve();
    };
    overlay.webContents.once("did-finish-load", () => {
      if (overlay.isDestroyed()) return;
      overlay.once("ready-to-show", reveal);
      if (overlay.isVisible()) reveal();
    });
    overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(reject);
  });
}
