const { contextBridge, ipcRenderer, webUtils } = require("electron");

const WINDOW_GET_ALWAYS_ON_TOP = "perch:window:get-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP = "perch:window:set-always-on-top";
const PATH_OPEN_IN_FINDER = "perch:path:open-in-finder";
const SUMMON_CHANNEL = "perch:summon";

if (typeof webUtils?.getPathForFile !== "function") {
  throw new Error("Electron webUtils.getPathForFile is unavailable.");
}

contextBridge.exposeInMainWorld("perchDesktop", Object.freeze({
  getPathForFile(file) {
    try {
      const value = webUtils.getPathForFile(file);
      return typeof value === "string" ? value : "";
    } catch {
      return "";
    }
  },
  getAlwaysOnTop() {
    return ipcRenderer.invoke(WINDOW_GET_ALWAYS_ON_TOP);
  },
  setAlwaysOnTop(enabled) {
    if (typeof enabled !== "boolean") return Promise.reject(new TypeError("always-on-top preference must be boolean."));
    return ipcRenderer.invoke(WINDOW_SET_ALWAYS_ON_TOP, enabled);
  },
  openPathInFinder(localPath) {
    if (typeof localPath !== "string") return Promise.reject(new TypeError("local path must be a string."));
    return ipcRenderer.invoke(PATH_OPEN_IN_FINDER, localPath);
  },
  onSummon(handler) {
    if (typeof handler !== "function") throw new TypeError("summon handler must be a function.");
    const listener = () => {
      try { handler(); } catch { /* ignore renderer handler errors */ }
    };
    ipcRenderer.on(SUMMON_CHANNEL, listener);
    return () => ipcRenderer.removeListener(SUMMON_CHANNEL, listener);
  }
}));
