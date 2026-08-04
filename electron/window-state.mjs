import fs from "node:fs";
import path from "node:path";

export const DEFAULT_WINDOW_BOUNDS = Object.freeze({ width: 1440, height: 940 });
export const MIN_WINDOW_SIZE = Object.freeze({ width: 360, height: 320 });

function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function windowStatePath(userDataDir) {
  return path.join(userDataDir, "window-state.json");
}

export function boundsVisibleOnDisplays(bounds, displays) {
  if (!Array.isArray(displays) || !displays.length) return true;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return displays.some((display) => {
    const area = display.workArea || display.bounds;
    if (!area) return false;
    return centerX >= area.x
      && centerX < area.x + area.width
      && centerY >= area.y
      && centerY < area.y + area.height;
  });
}

export function sanitizeWindowState(raw = {}, { displays = [], defaults = DEFAULT_WINDOW_BOUNDS, minSize = MIN_WINDOW_SIZE } = {}) {
  const maxWidth = displays.reduce((max, display) => Math.max(max, display?.workArea?.width || display?.bounds?.width || 0), defaults.width);
  const maxHeight = displays.reduce((max, display) => Math.max(max, display?.workArea?.height || display?.bounds?.height || 0), defaults.height);
  const width = clamp(asFiniteNumber(raw.width) ?? defaults.width, minSize.width, Math.max(minSize.width, maxWidth || defaults.width));
  const height = clamp(asFiniteNumber(raw.height) ?? defaults.height, minSize.height, Math.max(minSize.height, maxHeight || defaults.height));
  let x = asFiniteNumber(raw.x);
  let y = asFiniteNumber(raw.y);
  if (x !== null && y !== null && !boundsVisibleOnDisplays({ x, y, width, height }, displays)) {
    x = null;
    y = null;
  }
  return {
    width,
    height,
    ...(x !== null ? { x } : {}),
    ...(y !== null ? { y } : {}),
    maximized: Boolean(raw.maximized),
    fullScreen: Boolean(raw.fullScreen),
  };
}

export function readWindowState(filePath, options = {}) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return sanitizeWindowState(raw, options);
  } catch {
    return sanitizeWindowState({}, options);
  }
}

export function writeWindowState(filePath, state) {
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, payload, "utf8");
  fs.renameSync(tempPath, filePath);
}

export function captureWindowState(window) {
  const maximized = Boolean(window.isMaximized?.());
  const fullScreen = Boolean(window.isFullScreen?.());
  const bounds = (maximized || fullScreen) && typeof window.getNormalBounds === "function"
    ? window.getNormalBounds()
    : window.getBounds();
  return sanitizeWindowState({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    maximized,
    fullScreen,
  });
}

export function createWindowStateTracker({
  filePath,
  getDisplays,
  debounceMs = 250,
} = {}) {
  let timer = null;
  const persist = (window) => {
    if (!window || window.isDestroyed?.()) return;
    writeWindowState(filePath, captureWindowState(window));
  };
  return {
    load() {
      return readWindowState(filePath, { displays: getDisplays?.() || [] });
    },
    saveNow(window) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      persist(window);
    },
    scheduleSave(window) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        persist(window);
      }, debounceMs);
    },
    attach(window) {
      const save = () => this.scheduleSave(window);
      window.on("resize", save);
      window.on("move", save);
      window.on("maximize", save);
      window.on("unmaximize", save);
      window.on("enter-full-screen", save);
      window.on("leave-full-screen", save);
      window.on("close", () => this.saveNow(window));
    },
  };
}
