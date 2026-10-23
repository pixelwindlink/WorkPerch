export function getDesktopCapabilities(platform = process.platform) {
  return {
    platform,
    clipboardFiles: platform === "darwin" || platform === "win32",
    externalWindowLayouts: platform === "darwin",
    parkAnimation: platform === "darwin" || platform === "win32",
    summonHotkey: platform === "darwin" ? "Command+Shift+D" : "Control+Shift+D",
  };
}
