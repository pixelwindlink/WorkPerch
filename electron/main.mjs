import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, nativeImage, shell, screen } from "electron";
import { clipboardHistoryPath, createClipboardHistoryStore } from "./clipboard-history.mjs";
import { createClipboardWatcher } from "./clipboard-watcher.mjs";
import { readImageBlob } from "./clipboard-blob-store.mjs";
import { readClipboardSnapshot } from "./clipboard-snapshot.mjs";
import { writeClipboardFilePaths } from "./clipboard-files.mjs";
import { getDesktopCapabilities } from "./desktop-capabilities.mjs";
import {
  applyWindowBounds,
  captureFrontWindowBounds,
  createExternalWindowLayoutStore,
  externalWindowLayoutsPath,
  EXTERNAL_WINDOW_PRESETS,
} from "./external-window-layout.mjs";
import { createPerchHttpServer } from "../server.mjs";
import { openPathInFinder } from "./finder-path-controller.mjs";
import { LocalEngineClient } from "./local-engine-client.mjs";
import { acquirePerchServer, resolveDesktopGenericEnginesRoot, resolveDesktopServerUrl, resolveProjectLauncherRoot } from "./server-coordinator.mjs";
import {
  CLIPBOARD_PANEL_MIN_WINDOW_HEIGHT,
  createWindowStateTracker,
  MIN_WINDOW_SIZE,
  windowStatePath,
} from "./window-state.mjs";
import { cancelParkChargeOverlay, startParkChargeOverlay } from "./park-charge-overlay.mjs";
import { readPerchThemeColors } from "./park-theme-colors.mjs";
import { PARK_CHARGE_COLLAPSE_MS, PARK_TIMING_SCALE, parkTimingForScale } from "./park-charge-timing.mjs";
import { showParkFrameAnimation } from "./park-animation.mjs";
import { compactTopRightBounds, resolveCompactTopRightBounds } from "./window-park.mjs";
import { createAlwaysOnTopOpacityController } from "./always-on-top-opacity.mjs";

const ELECTRON_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ICON_PATH = path.join(ELECTRON_DIR, "..", "assets", "app-icon", "Perch.icns");

function applyPerchAppIcon() {
  if (!nativeImage.createFromPath(APP_ICON_PATH).isEmpty()) {
    if (process.platform === "darwin" && app.dock) app.dock.setIcon(APP_ICON_PATH);
    return nativeImage.createFromPath(APP_ICON_PATH);
  }
  return null;
}
const DEVELOPMENT_GENERIC_ENGINES_ROOT = path.resolve(ELECTRON_DIR, "../../..");
const DEVELOPMENT_PROJECT_LAUNCHER_ROOT = path.resolve(ELECTRON_DIR, "../../project-launcher");
const LAUNCHER_ACTIONS = ["launcher.definition.upsert", "launcher.project.start", "launcher.project.stop", "launcher.runtime.get"];
const WINDOW_GET_ALWAYS_ON_TOP = "perch:window:get-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP = "perch:window:set-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP_OPACITY = "perch:window:set-always-on-top-opacity";
const WINDOW_POINTER_INSIDE = "perch:window:pointer-inside";
const WINDOW_GET_BOUNDS = "perch:window:get-bounds";
const WINDOW_PARK_CHARGE_START = "perch:window:park-charge-start";
const WINDOW_PARK_CHARGE_CANCEL = "perch:window:park-charge-cancel";
const WINDOW_PARK_COMPACT_TOP_RIGHT = "perch:window:park-compact-top-right";
const PATH_OPEN_IN_FINDER = "perch:path:open-in-finder";
const CLIPBOARD_LIST = "perch:clipboard:list";
const CLIPBOARD_GET = "perch:clipboard:get";
const CLIPBOARD_WRITE = "perch:clipboard:write";
const CLIPBOARD_HISTORY_CHANGED = "perch:clipboard:history-changed";
const CLIPBOARD_SET_PANEL_ACTIVE = "perch:clipboard:set-panel-active";
const EXTERNAL_WINDOW_LIST = "perch:external-window:list";
const EXTERNAL_WINDOW_CAPTURE = "perch:external-window:capture";
const EXTERNAL_WINDOW_APPLY = "perch:external-window:apply";
const SUMMON_CHANNEL = "perch:summon";
const DESKTOP_CAPABILITIES = "perch:desktop:capabilities";
const SUMMON_HOTKEY = getDesktopCapabilities().summonHotkey;
const serverTarget = resolveDesktopServerUrl(process.env);
let lease;
let launcherEngine;
let runtimeHost;
let monitorHallInfo = null;
let launcherDiagnostic = null;
let mainWindow;
let alwaysOnTopOpacityController = null;
let quitting = false;
let windowStateTracker = null;
let clipboardHistoryStore = null;
let clipboardWatcher = null;
let externalWindowLayoutStore = null;

const EXTERNAL_WINDOW_ERROR_MESSAGES = {
  EXTERNAL_WINDOW_UNSUPPORTED_PLATFORM: "仅支持 macOS",
  EXTERNAL_WINDOW_NOT_RUNNING: "目标应用未运行，请先打开对应窗口",
  EXTERNAL_WINDOW_NO_WINDOW: "目标应用没有可用窗口",
  EXTERNAL_WINDOW_BOUNDS_INVALID: "无法读取窗口位置",
  EXTERNAL_WINDOW_APPLY_FAILED: "恢复窗口失败",
};

function mapExternalWindowError(error) {
  const code = error?.message || String(error);
  return EXTERNAL_WINDOW_ERROR_MESSAGES[code] || "窗口操作失败";
}

function ensureClipboardHistoryStore() {
  if (!clipboardHistoryStore) {
    const userDataDir = app.getPath("userData");
    clipboardHistoryStore = createClipboardHistoryStore({
      filePath: clipboardHistoryPath(userDataDir),
      userDataDir,
    });
  }
  return clipboardHistoryStore;
}

function ensureExternalWindowLayoutStore() {
  if (!externalWindowLayoutStore) {
    externalWindowLayoutStore = createExternalWindowLayoutStore(
      externalWindowLayoutsPath(app.getPath("userData")),
    );
  }
  return externalWindowLayoutStore;
}

function notifyClipboardHistoryChanged(entry) {
  if (!entry?.id || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(CLIPBOARD_HISTORY_CHANGED, { id: entry.id });
}

function startClipboardWatcher() {
  ensureClipboardHistoryStore();
  if (clipboardWatcher) return;
  clipboardWatcher = createClipboardWatcher({
    observeClipboardText() {
      try {
        const snapshot = readClipboardSnapshot(clipboard);
        return snapshot ? clipboardHistoryStore.observeSnapshot(snapshot) : null;
      } catch {
        return null;
      }
    },
    onHistoryChanged: notifyClipboardHistoryChanged,
  });
  clipboardWatcher.start();
}

function stopClipboardWatcher() {
  clipboardWatcher?.stop();
  clipboardWatcher = null;
}

function currentPerchWindow(event) {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow || mainWindow.isDestroyed() || sourceWindow !== mainWindow) {
    throw new Error("Perch Desktop window request source is not allowed.");
  }
  return sourceWindow;
}

function setPerchWindowAlwaysOnTop(window, enabled) {
  if (enabled) window.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  else window.setAlwaysOnTop(false);
  if (process.platform === "darwin") {
    window.setVisibleOnAllWorkspaces(enabled, { visibleOnFullScreen: enabled });
  }
  const active = window.isAlwaysOnTop();
  alwaysOnTopOpacityController?.setAlwaysOnTop(active);
  return active;
}

function normalizeBounds(raw) {
  const x = Number(raw?.x);
  const y = Number(raw?.y);
  const width = Number(raw?.width);
  const height = Number(raw?.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function prepareWindowForPark(window) {
  if (window.isFullScreen()) window.setFullScreen(false);
  if (window.isMaximized()) window.unmaximize();
}

function computeParkTargetBounds(anchorBounds) {
  const anchor = normalizeBounds(anchorBounds);
  if (!anchor) throw new TypeError("park anchor bounds are invalid.");
  return resolveCompactTopRightBounds(
    anchor,
    (bounds) => screen.getDisplayMatching(bounds),
    (point) => screen.getDisplayNearestPoint(point),
    { width: MIN_WINDOW_SIZE.width, height: CLIPBOARD_PANEL_MIN_WINDOW_HEIGHT, margin: 0 },
  );
}

function applyParkTargetBounds(window, target) {
  window.setBounds(target);
  if (typeof window.setPosition === "function") window.setPosition(target.x, target.y);
  const alwaysOnTop = setPerchWindowAlwaysOnTop(window, true);
  windowStateTracker?.saveNow(window);
  return { alwaysOnTop, bounds: window.getBounds() };
}

function resolveParkEffectOptions(options = {}) {
  const timingScale = Number(options.timingScale);
  const scale = Number.isFinite(timingScale) ? timingScale : PARK_TIMING_SCALE;
  const timing = parkTimingForScale(scale);
  const fadeRaw = Number(options.frameFadeOutMs);
  const frameFadeOutMs = Number.isFinite(fadeRaw)
    ? Math.min(400, Math.max(0, Math.round(fadeRaw)))
    : timing.PARK_FRAME_FADE_OUT_MS;
  return {
    effectsEnabled: options.effectsEnabled !== false,
    timing,
    frameDurationMs: Math.round(560 * scale),
    frameFadeOutMs,
  };
}

async function parkPerchWindowCompactTopRight(window, options = {}) {
  prepareWindowForPark(window);
  const from = normalizeBounds(window.getBounds()) || normalizeBounds(options.fromBounds);
  if (!from) throw new TypeError("park source bounds are invalid.");
  const target = computeParkTargetBounds(from);
  const parked = applyParkTargetBounds(window, target);
  const to = normalizeBounds(window.getBounds()) || target;
  const parkFx = resolveParkEffectOptions(options);
  if (parkFx.effectsEnabled) {
    const theme = await readPerchThemeColors(window);
    await showParkFrameAnimation(from, to, {
      theme,
      durationMs: parkFx.frameDurationMs,
      fadeOutMs: parkFx.frameFadeOutMs,
    });
  }
  cancelParkChargeOverlay();
  return parked;
}

function summonPerchWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send(SUMMON_CHANNEL);
}

function registerSummonHotkey() {
  try {
    const ok = globalShortcut.register(SUMMON_HOTKEY, summonPerchWindow);
    if (!ok) process.stderr.write(`Perch summon hotkey ${SUMMON_HOTKEY} unavailable.\n`);
    else process.stderr.write(`Perch summon hotkey ready: ${SUMMON_HOTKEY}\n`);
  } catch (error) {
    process.stderr.write(`Perch summon hotkey failed: ${String(error?.message || error).slice(0, 200)}\n`);
  }
}

function registerDesktopIpcHandlers() {
  ipcMain.handle(WINDOW_GET_ALWAYS_ON_TOP, (event) => currentPerchWindow(event).isAlwaysOnTop());
  ipcMain.handle(WINDOW_SET_ALWAYS_ON_TOP, (event, enabled) => {
    if (typeof enabled !== "boolean") throw new TypeError("always-on-top preference must be boolean.");
    return setPerchWindowAlwaysOnTop(currentPerchWindow(event), enabled);
  });
  ipcMain.handle(WINDOW_SET_ALWAYS_ON_TOP_OPACITY, (event, payload = {}) => {
    currentPerchWindow(event);
    const percent = Number(payload.transparencyPercent);
    alwaysOnTopOpacityController?.setTransparencyPercent(percent);
    return true;
  });
  ipcMain.handle(WINDOW_POINTER_INSIDE, (event, inside) => {
    currentPerchWindow(event);
    alwaysOnTopOpacityController?.setPointerInside(Boolean(inside));
    return true;
  });
  ipcMain.handle(WINDOW_GET_BOUNDS, (event) => currentPerchWindow(event).getBounds());
  ipcMain.handle(WINDOW_PARK_CHARGE_START, async (event, options = {}) => {
    const window = currentPerchWindow(event);
    const bounds = window.getBounds();
    const parkFx = resolveParkEffectOptions(options);
    if (!parkFx.effectsEnabled) return bounds;
    const theme = await readPerchThemeColors(window);
    await startParkChargeOverlay(bounds, {
      ownerWindow: window,
      theme,
      durationMs: parkFx.timing.PARK_CHARGE_EXPAND_MS,
      masterFadeDurationMs: parkFx.timing.PARK_CHARGE_MASTER_FADE_MS,
    });
    return bounds;
  });
  ipcMain.handle(WINDOW_PARK_CHARGE_CANCEL, () => {
    cancelParkChargeOverlay();
  });
  ipcMain.handle(WINDOW_PARK_COMPACT_TOP_RIGHT, (event, options) => parkPerchWindowCompactTopRight(currentPerchWindow(event), options));
  ipcMain.handle(PATH_OPEN_IN_FINDER, async (event, localPath) => {
    currentPerchWindow(event);
    return openPathInFinder(localPath, {
      openDirectory: (value) => shell.openPath(value),
      showItemInFolder: (value) => shell.showItemInFolder(value),
    });
  });
  ipcMain.handle(CLIPBOARD_LIST, (event) => {
    currentPerchWindow(event);
    return ensureClipboardHistoryStore().list();
  });
  ipcMain.handle(CLIPBOARD_GET, (event, id) => {
    currentPerchWindow(event);
    if (typeof id !== "string") throw new TypeError("clipboard id must be a string.");
    const item = ensureClipboardHistoryStore().get(id);
    if (!item) return null;
    if (item.kind === "image") {
      const buffer = readImageBlob(app.getPath("userData"), item.blobPath);
      if (!buffer) return null;
      return {
        ...item,
        imageDataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      };
    }
    return item;
  });
  ipcMain.handle(CLIPBOARD_WRITE, (event, id) => {
    currentPerchWindow(event);
    if (typeof id !== "string") throw new TypeError("clipboard id must be a string.");
    const item = ensureClipboardHistoryStore().get(id);
    if (!item) return null;
    if (item.kind === "text") {
      clipboard.writeText(item.text);
      return { id: item.id, kind: "text" };
    }
    if (item.kind === "image") {
      const buffer = readImageBlob(app.getPath("userData"), item.blobPath);
      if (!buffer) return null;
      clipboard.writeImage(nativeImage.createFromBuffer(buffer));
      return { id: item.id, kind: "image" };
    }
    if (item.kind === "files") {
      if (!writeClipboardFilePaths(clipboard, item.paths)) return null;
      return { id: item.id, kind: "files", fileCount: item.paths.length };
    }
    return null;
  });
  ipcMain.handle(CLIPBOARD_SET_PANEL_ACTIVE, (event, active) => {
    currentPerchWindow(event);
    clipboardWatcher?.setPanelActive(Boolean(active));
    return true;
  });
  ipcMain.handle(DESKTOP_CAPABILITIES, (event) => {
    currentPerchWindow(event);
    return getDesktopCapabilities();
  });
  ipcMain.handle(EXTERNAL_WINDOW_LIST, (event) => {
    currentPerchWindow(event);
    return ensureExternalWindowLayoutStore().list();
  });
  ipcMain.handle(EXTERNAL_WINDOW_CAPTURE, async (event, presetId) => {
    currentPerchWindow(event);
    if (typeof presetId !== "string") throw new TypeError("preset id must be a string.");
    const preset = EXTERNAL_WINDOW_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) throw new Error("EXTERNAL_WINDOW_PRESET_UNKNOWN");
    try {
      const bounds = await captureFrontWindowBounds(preset.bundleId);
      return ensureExternalWindowLayoutStore().save(presetId, bounds);
    } catch (error) {
      throw new Error(mapExternalWindowError(error));
    }
  });
  ipcMain.handle(EXTERNAL_WINDOW_APPLY, async (event, presetId) => {
    currentPerchWindow(event);
    if (typeof presetId !== "string") throw new TypeError("preset id must be a string.");
    const saved = ensureExternalWindowLayoutStore().get(presetId);
    if (!saved) throw new Error("尚未保存该应用的窗口布局");
    const preset = EXTERNAL_WINDOW_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) throw new Error("EXTERNAL_WINDOW_PRESET_UNKNOWN");
    try {
      await applyWindowBounds(preset.bundleId, saved);
      return { ok: true };
    } catch (error) {
      throw new Error(mapExternalWindowError(error));
    }
  });
}

async function ensureServer() {
  if (lease) return lease;
  const genericEnginesRoot = resolveDesktopGenericEnginesRoot({
    environment: process.env,
    homeDir: app.getPath("home"),
    resourcesPath: process.resourcesPath,
    developmentRoot: DEVELOPMENT_GENERIC_ENGINES_ROOT,
    isPackaged: app.isPackaged
  });
  let localLauncher;
  let engineClient = null;
  try {
    const launcherRoot = resolveProjectLauncherRoot({
      environment: process.env,
      resourcesPath: process.resourcesPath,
      developmentRoot: DEVELOPMENT_PROJECT_LAUNCHER_ROOT,
      isPackaged: app.isPackaged
    });
    const { createRuntimeHost } = await import(pathToFileURL(path.join(genericEnginesRoot, "runtime_platform", "index.mjs")).href);
    runtimeHost = await createRuntimeHost({ governanceRoot: genericEnginesRoot });
    const runtimeDir = process.env.PROJECT_LAUNCHER_RUNTIME_DIR || path.join(app.getPath("userData"), "project-launcher-runtime");
    await runtimeHost.installEngine(launcherRoot, {
      providerOptions: {
        mode: "desktop",
        runtimeDir,
        genericEnginesRoot
      }
    });
    await runtimeHost.startEngine({ engineId: "project-launcher" });
    const evidence = runtimeHost.describe().instances.find((entry) => entry.instanceId.includes("project-launcher") || entry.registrationState === "runtime-instance-online");
    if (!evidence || evidence.registrationState !== "runtime-instance-online") {
      throw new Error("Project Launcher Runtime Instance is not online.");
    }
    // Keep a handle reference only for shutdown compatibility diagnostics.
    localLauncher = { async shutdown() { /* Host owns lifecycle */ }, async health() { return { state: "ready" }; } };
    engineClient = new LocalEngineClient({
      engineId: "project-launcher",
      allowedActions: LAUNCHER_ACTIONS,
      sourceEngine: "perch",
      send: (message, options) => runtimeHost.engineClient.send(message, options)
    });
    if (process.env.PERCH_MONITOR_HALL !== "0") {
      const port = Number(process.env.MONITOR_HALL_PORT || 8787);
      monitorHallInfo = await runtimeHost.startMonitorHall({ host: "127.0.0.1", port });
      process.stderr.write(`EngineMessage monitor hall: ${monitorHallInfo.hallUrl}\n`);
    }
    launcherDiagnostic = null;
  } catch (error) {
    await runtimeHost?.shutdown().catch(() => {});
    runtimeHost = null;
    monitorHallInfo = null;
    localLauncher = null;
    launcherDiagnostic = String(error?.message || error).slice(0, 500);
    process.stderr.write(`Project Launcher unavailable; Perch CRUD remains available: ${launcherDiagnostic}\n`);
  }
  try {
    lease = await acquirePerchServer({
      baseUrl: serverTarget.baseUrl,
      allowReuse: false,
      createServer: () => createPerchHttpServer({ host: serverTarget.host, port: serverTarget.port, genericEnginesRoot, engineClient })
    });
    launcherEngine = localLauncher;
  } catch (error) {
    await runtimeHost?.shutdown().catch(() => {});
    runtimeHost = null;
    throw error;
  }
  return lease;
}

async function createWindow() {
  const activeLease = await ensureServer();
  windowStateTracker ||= createWindowStateTracker({
    filePath: windowStatePath(app.getPath("userData")),
    getDisplays: () => screen.getAllDisplays(),
  });
  const saved = windowStateTracker.load();
  const appIcon = applyPerchAppIcon();
  mainWindow = new BrowserWindow({
    title: "WorkPerch",
    ...(appIcon ? { icon: appIcon } : {}),
    width: saved.width,
    height: saved.height,
    ...(Number.isFinite(saved.x) ? { x: saved.x } : {}),
    ...(Number.isFinite(saved.y) ? { y: saved.y } : {}),
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: CLIPBOARD_PANEL_MIN_WINDOW_HEIGHT,
    backgroundColor: "#0b0d10",
    show: false,
    webPreferences: {
      preload: path.join(ELECTRON_DIR, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  windowStateTracker.attach(mainWindow);
  alwaysOnTopOpacityController = createAlwaysOnTopOpacityController(mainWindow);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== activeLease.baseUrl) event.preventDefault();
  });
  mainWindow.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow.setTitle("WorkPerch");
  });
  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (saved.fullScreen) mainWindow.setFullScreen(true);
    else if (saved.maximized) mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on("closed", () => {
    alwaysOnTopOpacityController?.dispose();
    alwaysOnTopOpacityController = null;
    mainWindow = null;
  });
  await mainWindow.loadURL(activeLease.baseUrl);
  startClipboardWatcher();
  const desktopBridgeReady = await mainWindow.webContents.executeJavaScript('["getPathForFile", "getAlwaysOnTop", "setAlwaysOnTop", "openPathInFinder", "onSummon", "getDesktopCapabilities"].every((name) => typeof window.perchDesktop?.[name] === "function") && typeof window.perchDesktop?.clipboard?.list === "function"');
  if (!desktopBridgeReady) throw new Error("Perch Desktop preload bridge 未完整加载。");
  registerSummonHotkey();
  process.stderr.write(`Perch Desktop ready at ${activeLease.baseUrl} (owned composition Server; Project Launcher ${launcherEngine ? "ready" : `unavailable: ${launcherDiagnostic}`}; desktop bridge ready)\n`);
}

async function stopOwnedServices() {
  const ownedServer = lease?.owned ? lease.server : null;
  const ownedHost = runtimeHost;
  lease = null;
  launcherEngine = null;
  runtimeHost = null;
  monitorHallInfo = null;
  const results = await Promise.allSettled([
    ownedServer?.stop(),
    ownedHost?.shutdown()
  ].filter(Boolean));
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  registerDesktopIpcHandlers();
  app.on("second-instance", () => {
    summonPerchWindow();
  });

  app.whenReady().then(createWindow).catch((error) => {
    process.stderr.write(`perch desktop failure: ${String(error?.message || error).slice(0, 500)}\n`);
    app.exit(1);
  });

  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow().catch((error) => {
      process.stderr.write(`perch desktop window failure: ${String(error?.message || error).slice(0, 500)}\n`);
    });
  });

  app.on("window-all-closed", () => app.quit());

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
    stopClipboardWatcher();
  });

  app.on("before-quit", (event) => {
    if (quitting || (!lease?.owned && !runtimeHost && !launcherEngine)) return;
    event.preventDefault();
    quitting = true;
    stopOwnedServices().finally(() => app.quit());
  });
}
