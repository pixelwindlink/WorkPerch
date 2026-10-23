import path from "node:path";
import { readDarwinClipboardFilePaths, writeDarwinClipboardFilePaths } from "./clipboard-files-darwin.mjs";
import { readWin32ClipboardFilePaths, writeWin32ClipboardFilePaths } from "./clipboard-files-win32.mjs";

export function isAbsoluteLocalPath(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const normalized = value.trim();
  if (path.isAbsolute(normalized)) return true;
  if (process.platform === "win32" && /^[A-Za-z]:[\\/]/.test(normalized)) return true;
  return false;
}

export function readClipboardFilePaths(clipboard) {
  if (process.platform === "darwin") return readDarwinClipboardFilePaths(clipboard);
  if (process.platform === "win32") return readWin32ClipboardFilePaths(clipboard);
  return [];
}

export function writeClipboardFilePaths(clipboard, filePaths) {
  const paths = filePaths.filter((entry) => isAbsoluteLocalPath(entry));
  if (!paths.length) return false;
  if (process.platform === "darwin") return writeDarwinClipboardFilePaths(clipboard, paths);
  if (process.platform === "win32") return writeWin32ClipboardFilePaths(clipboard, paths);
  return false;
}
