import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createDashboardHttpServer } from "../server.mjs";
import { acquireDashboardServer, resolveDesktopGenericEnginesRoot, resolveDesktopServerUrl } from "./server-coordinator.mjs";

const ELECTRON_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEVELOPMENT_GENERIC_ENGINES_ROOT = path.resolve(ELECTRON_DIR, "../../..");
const WINDOW_GET_ALWAYS_ON_TOP = "dashboard:window:get-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP = "dashboard:window:set-always-on-top";
const serverTarget = resolveDesktopServerUrl(process.env);
let lease;
let mainWindow;
let quitting = false;

function currentDashboardWindow(event) {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (!mainWindow || mainWindow.isDestroyed() || sourceWindow !== mainWindow) {
    throw new Error("Dashboard Desktop window request source is not allowed.");
  }
  return sourceWindow;
}

function setDashboardWindowAlwaysOnTop(window, enabled) {
  if (enabled) window.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  else window.setAlwaysOnTop(false);
  if (process.platform === "darwin") {
    window.setVisibleOnAllWorkspaces(enabled, { visibleOnFullScreen: enabled });
  }
  return window.isAlwaysOnTop();
}

function registerWindowPreferenceHandlers() {
  ipcMain.handle(WINDOW_GET_ALWAYS_ON_TOP, (event) => currentDashboardWindow(event).isAlwaysOnTop());
  ipcMain.handle(WINDOW_SET_ALWAYS_ON_TOP, (event, enabled) => {
    if (typeof enabled !== "boolean") throw new TypeError("always-on-top preference must be boolean.");
    return setDashboardWindowAlwaysOnTop(currentDashboardWindow(event), enabled);
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
  lease = await acquireDashboardServer({
    baseUrl: serverTarget.baseUrl,
    createServer: () => createDashboardHttpServer({ host: serverTarget.host, port: serverTarget.port, genericEnginesRoot })
  });
  return lease;
}

async function createWindow() {
  const activeLease = await ensureServer();
  mainWindow = new BrowserWindow({
    title: "Dashboard Engine",
    width: 1440,
    height: 940,
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
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== activeLease.baseUrl) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  await mainWindow.loadURL(activeLease.baseUrl);
  const desktopBridgeReady = await mainWindow.webContents.executeJavaScript('["getPathForFile", "getAlwaysOnTop", "setAlwaysOnTop"].every((name) => typeof window.dashboardDesktop?.[name] === "function")');
  if (!desktopBridgeReady) throw new Error("Dashboard Desktop preload bridge 未完整加载。");
  process.stderr.write(`Dashboard Desktop ready at ${activeLease.baseUrl} (${activeLease.owned ? "owned Server" : "existing Server"}; desktop bridge ready)\n`);
}

async function stopOwnedServer() {
  if (!lease?.owned || !lease.server) return;
  const ownedServer = lease.server;
  lease = null;
  await ownedServer.stop();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  registerWindowPreferenceHandlers();
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow).catch((error) => {
    process.stderr.write(`dashboard desktop failure: ${String(error?.message || error).slice(0, 500)}\n`);
    app.exit(1);
  });

  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow().catch((error) => {
      process.stderr.write(`dashboard desktop window failure: ${String(error?.message || error).slice(0, 500)}\n`);
    });
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", (event) => {
    if (quitting || !lease?.owned) return;
    event.preventDefault();
    quitting = true;
    stopOwnedServer().finally(() => app.quit());
  });
}
