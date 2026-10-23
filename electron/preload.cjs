const { contextBridge, ipcRenderer, webUtils } = require("electron");

const WINDOW_GET_ALWAYS_ON_TOP = "perch:window:get-always-on-top";
const WINDOW_SET_ALWAYS_ON_TOP = "perch:window:set-always-on-top";
const WINDOW_GET_BOUNDS = "perch:window:get-bounds";
const WINDOW_PARK_CHARGE_START = "perch:window:park-charge-start";
const WINDOW_PARK_CHARGE_CANCEL = "perch:window:park-charge-cancel";
const WINDOW_PARK_COMPACT_TOP_RIGHT = "perch:window:park-compact-top-right";
const PATH_OPEN_IN_FINDER = "perch:path:open-in-finder";
const CLIPBOARD_LIST = "perch:clipboard:list";
const CLIPBOARD_GET = "perch:clipboard:get";
const CLIPBOARD_WRITE = "perch:clipboard:write";
const EXTERNAL_WINDOW_LIST = "perch:external-window:list";
const EXTERNAL_WINDOW_CAPTURE = "perch:external-window:capture";
const EXTERNAL_WINDOW_APPLY = "perch:external-window:apply";
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
  getWindowBounds() {
    return ipcRenderer.invoke(WINDOW_GET_BOUNDS);
  },
  startParkCharge() {
    return ipcRenderer.invoke(WINDOW_PARK_CHARGE_START);
  },
  cancelParkCharge() {
    return ipcRenderer.invoke(WINDOW_PARK_CHARGE_CANCEL);
  },
  parkWindowCompactTopRight(options) {
    return ipcRenderer.invoke(WINDOW_PARK_COMPACT_TOP_RIGHT, options ?? {});
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
  },
  clipboard: Object.freeze({
    list() {
      return ipcRenderer.invoke(CLIPBOARD_LIST);
    },
    get(id) {
      if (typeof id !== "string") return Promise.reject(new TypeError("clipboard id must be a string."));
      return ipcRenderer.invoke(CLIPBOARD_GET, id);
    },
    copy(id) {
      if (typeof id !== "string") return Promise.reject(new TypeError("clipboard id must be a string."));
      return ipcRenderer.invoke(CLIPBOARD_WRITE, id);
    },
  }),
  externalWindows: Object.freeze({
    list() {
      return ipcRenderer.invoke(EXTERNAL_WINDOW_LIST);
    },
    capture(presetId) {
      if (typeof presetId !== "string") return Promise.reject(new TypeError("preset id must be a string."));
      return ipcRenderer.invoke(EXTERNAL_WINDOW_CAPTURE, presetId);
    },
    apply(presetId) {
      if (typeof presetId !== "string") return Promise.reject(new TypeError("preset id must be a string."));
      return ipcRenderer.invoke(EXTERNAL_WINDOW_APPLY, presetId);
    },
  }),
}));
