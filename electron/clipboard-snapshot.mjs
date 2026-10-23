import path from "node:path";
import { normalizeClipboardText } from "./clipboard-history.mjs";
import { readClipboardFilePaths } from "./clipboard-files.mjs";
import { CLIPBOARD_IMAGE_MAX_BYTES } from "../ui/clipboard-config.js";

function basenameList(paths, limit = 2) {
  const names = paths.map((entry) => path.basename(entry)).filter(Boolean);
  if (!names.length) return "文件";
  if (names.length === 1) return names[0];
  if (names.length <= limit) return `${names[0]} 等 ${names.length} 项`;
  return `${names[0]} 等 ${paths.length} 项`;
}

function readClipboardImage(clipboard) {
  const image = clipboard.readImage?.();
  if (!image || image.isEmpty?.()) return null;
  const png = image.toPNG();
  if (!png?.length || png.length > CLIPBOARD_IMAGE_MAX_BYTES) return null;
  const size = image.getSize?.() || { width: 0, height: 0 };
  return {
    pngBuffer: png,
    width: Number(size.width) || 0,
    height: Number(size.height) || 0,
  };
}

/**
 * @param {import("electron").Clipboard} clipboard
 */
export function readClipboardSnapshot(clipboard) {
  const filePaths = readClipboardFilePaths(clipboard);
  if (filePaths.length) {
    return { kind: "files", paths: filePaths };
  }

  const text = normalizeClipboardText(clipboard.readText?.() || "");
  if (text) {
    return { kind: "text", text };
  }

  const image = readClipboardImage(clipboard);
  if (image) {
    return { kind: "image", pngBuffer: image.pngBuffer, width: image.width, height: image.height };
  }
  return null;
}

export function buildSnapshotPreview(snapshot) {
  if (!snapshot) return "";
  if (snapshot.kind === "text") {
    const normalized = normalizeClipboardText(snapshot.text);
    return normalized.length > 240 ? `${normalized.slice(0, 240)}…` : normalized;
  }
  if (snapshot.kind === "image") {
    const { width, height } = snapshot;
    if (width && height) return `图片 ${width}×${height}`;
    return "图片";
  }
  if (snapshot.kind === "files") {
    return basenameList(snapshot.paths);
  }
  return "";
}
