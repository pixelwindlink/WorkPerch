const { contextBridge, webUtils } = require("electron");

contextBridge.exposeInMainWorld("dashboardDesktop", Object.freeze({
  getPathForFile(file) {
    try {
      const value = webUtils.getPathForFile(file);
      return typeof value === "string" ? value : "";
    } catch {
      return "";
    }
  }
}));
