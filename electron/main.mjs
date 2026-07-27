import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, shell } from "electron";
import { createDashboardHttpServer } from "../server.mjs";
import { acquireDashboardServer, resolveDesktopServerUrl } from "./server-coordinator.mjs";

const ELECTRON_DIR = path.dirname(fileURLToPath(import.meta.url));
const serverTarget = resolveDesktopServerUrl(process.env);
let lease;
let mainWindow;
let quitting = false;

async function ensureServer() {
  if (lease) return lease;
  lease = await acquireDashboardServer({
    baseUrl: serverTarget.baseUrl,
    createServer: () => createDashboardHttpServer({ host: serverTarget.host, port: serverTarget.port })
  });
  return lease;
}

async function createWindow() {
  const activeLease = await ensureServer();
  mainWindow = new BrowserWindow({
    title: "Dashboard Engine",
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 620,
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
}

async function stopOwnedServer() {
  if (!lease?.owned || !lease.server) return;
  const ownedServer = lease.server;
  lease = null;
  await ownedServer.stop();
}

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
