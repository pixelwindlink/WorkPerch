import path from "node:path";
import { buildCFHdrop, parseCFHdrop } from "../lib/cf-hdrop.mjs";

const CF_HDROP = "CF_HDROP";

function readUriListPaths(clipboard) {
  const formats = clipboard.availableFormats?.() || [];
  const format = formats.find((entry) => entry.toLowerCase() === "text/uri-list");
  if (!format) return [];
  try {
    const raw = clipboard.read(format);
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("file://"))
      .map((line) => {
        try {
          const url = new URL(line);
          if (url.protocol !== "file:") return "";
          return decodeURIComponent(url.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
        } catch {
          return "";
        }
      })
      .filter((entry) => path.win32.isAbsolute(entry));
  } catch {
    return [];
  }
}

export function readWin32ClipboardFilePaths(clipboard) {
  const formats = clipboard.availableFormats?.() || [];
  if (formats.includes(CF_HDROP)) {
    try {
      const paths = parseCFHdrop(clipboard.readBuffer(CF_HDROP));
      if (paths.length) return paths;
    } catch {
      /* fall through */
    }
  }
  return readUriListPaths(clipboard);
}

export function writeWin32ClipboardFilePaths(clipboard, filePaths) {
  const buffer = buildCFHdrop(filePaths);
  if (!buffer) return false;
  try {
    clipboard.writeBuffer(CF_HDROP, buffer);
    return true;
  } catch {
    return false;
  }
}
