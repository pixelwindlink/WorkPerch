import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, globalShortcut, ipcMain, shell, screen } from "electron";
import { createPerchHttpServer } from "../server.mjs";
import { openPathInFinder } from "./finder-path-controller.mjs";
import { LocalEngineClient } from "./local-engine-client.mjs";
import { acquirePerchServer, resolveDesktopGenericEnginesRoot, resolveDesktopServerUrl, resolveProjectLauncherRoot } from "./server-coordinator.mjs";
import { createWindowStateTracker, windowStatePath } from "./window-state.mjs";

const ELECTRON_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEVELOPMENT_GENERIC_ENGINES_ROOT = path.resolve(ELECTRON_DIR, "../../..");
const DEVELOPMENT_PROJECT_LAUNCHER_ROOT = path.resolve(ELECTRON_DIR, "../../project-launcher");
const LAUNCHER_ACTIONS = ["launcher.definition.upsert", "launcher.project.start", "launcher.project.stop", "launcher.runtime.get"];
const WINDOW_GET_ALWAYS_ON_TOP = "perch:window:get-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP = "perch:window:set-always-on-top";
const PATH_OPEN_IN_FINDER = "perch:path:open-in-finder";
const SUMMON_CHANNEL = "perch:summon";
const SUMMON_HOTKEY = process.platform === "darwin" ? "Command+Shift+D" : "Control+Shift+D";
const serverTarget = resolveDesktopServerUrl(process.env);
let lease;
let launcherEngine;
let runtimeHost;
let monitorHallInfo = null;
let launcherDiagnostic = null;
let mainWindow;
let quitting = false;
let windowStateTracker = null;

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
  return window.isAlwaysOnTop();
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
  ipcMain.handle(PATH_OPEN_IN_FINDER, async (event, localPath) => {
    currentPerchWindow(event);
    return openPathInFinder(localPath, {
      openDirectory: (value) => shell.openPath(value),
      showItemInFolder: (value) => shell.showItemInFolder(value),
    });
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
  mainWindow = new BrowserWindow({
    title: "WorkPerch",
    width: saved.width,
    height: saved.height,
    ...(Number.isFinite(saved.x) ? { x: saved.x } : {}),
    ...(Number.isFinite(saved.y) ? { y: saved.y } : {}),
    minWidth: 360,
    minHeight: 320,
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
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== activeLease.baseUrl) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (saved.fullScreen) mainWindow.setFullScreen(true);
    else if (saved.maximized) mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  await mainWindow.loadURL(activeLease.baseUrl);
  const desktopBridgeReady = await mainWindow.webContents.executeJavaScript('["getPathForFile", "getAlwaysOnTop", "setAlwaysOnTop", "openPathInFinder", "onSummon"].every((name) => typeof window.perchDesktop?.[name] === "function")');
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
  });

  app.on("before-quit", (event) => {
    if (quitting || (!lease?.owned && !runtimeHost && !launcherEngine)) return;
    event.preventDefault();
    quitting = true;
    stopOwnedServices().finally(() => app.quit());
  });
}
