import crypto from "node:crypto";
import fs from "node:fs";
import { CLIPBOARD_HISTORY_LIMIT } from "../ui/clipboard-config.js";
import path from "node:path";
import { deleteImageBlob, saveImageBlob } from "./clipboard-blob-store.mjs";
import { isAbsoluteLocalPath } from "./clipboard-files.mjs";

export { CLIPBOARD_HISTORY_LIMIT };
export const CLIPBOARD_TEXT_MAX_CHARS = 32_000;

export function clipboardHistoryPath(userDataDir) {
  return path.join(userDataDir, "clipboard-history.json");
}

export function normalizeClipboardText(text) {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length > CLIPBOARD_TEXT_MAX_CHARS) return trimmed.slice(0, CLIPBOARD_TEXT_MAX_CHARS);
  return trimmed;
}

function fingerprintValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function previewForSnapshot(snapshot) {
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
    const names = snapshot.paths.map((entry) => path.basename(entry)).filter(Boolean);
    if (!names.length) return "文件";
    if (names.length === 1) return names[0];
    return `${names[0]} 等 ${snapshot.paths.length} 项`;
  }
  return "";
}

function normalizeStoredItem(raw) {
  if (!raw?.id || !raw.fingerprint) return null;
  if (raw.kind === "image" && raw.blobPath) {
    return {
      id: raw.id,
      kind: "image",
      fingerprint: raw.fingerprint,
      capturedAt: raw.capturedAt,
      preview: raw.preview || "图片",
      length: Number(raw.length) || 0,
      imageWidth: Number(raw.imageWidth) || 0,
      imageHeight: Number(raw.imageHeight) || 0,
      blobPath: raw.blobPath,
    };
  }
  if (raw.kind === "files" && Array.isArray(raw.paths) && raw.paths.length) {
    return {
      id: raw.id,
      kind: "files",
      fingerprint: raw.fingerprint,
      capturedAt: raw.capturedAt,
      preview: raw.preview || "文件",
      length: Number(raw.length) || raw.paths.length,
      paths: raw.paths.filter((entry) => typeof entry === "string"),
      fileCount: raw.paths.length,
    };
  }
  if (typeof raw.text === "string") {
    const text = normalizeClipboardText(raw.text);
    if (!text) return null;
    return {
      id: raw.id,
      kind: "text",
      text,
      fingerprint: raw.fingerprint,
      capturedAt: raw.capturedAt,
      preview: raw.preview || (text.length > 240 ? `${text.slice(0, 240)}…` : text),
      length: text.length,
    };
  }
  return null;
}

export function createClipboardHistoryStore({
  filePath,
  limit = CLIPBOARD_HISTORY_LIMIT,
  userDataDir = path.dirname(filePath),
} = {}) {
  let lastFingerprint = "";
  let items = [];

  function load() {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      items = Array.isArray(raw.items)
        ? raw.items.map(normalizeStoredItem).filter(Boolean).slice(0, limit)
        : [];
      lastFingerprint = typeof raw.lastFingerprint === "string" ? raw.lastFingerprint : "";
    } catch {
      items = [];
      lastFingerprint = "";
    }
  }

  function persist() {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const payload = `${JSON.stringify({ version: 2, lastFingerprint, items }, null, 2)}\n`;
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, payload, "utf8");
    fs.renameSync(tempPath, filePath);
  }

  function dropOverflow() {
    while (items.length > limit) {
      const removed = items.pop();
      if (removed?.kind === "image" && removed.blobPath) deleteImageBlob(userDataDir, removed.blobPath);
    }
  }

  function observeText(text) {
    const normalized = normalizeClipboardText(text);
    if (!normalized) return null;
    return observeSnapshot({ kind: "text", text: normalized });
  }

  function observeSnapshot(snapshot) {
    if (!snapshot?.kind) return null;
    let fp = "";
    let entry = null;

    if (snapshot.kind === "text") {
      const normalized = normalizeClipboardText(snapshot.text);
      if (!normalized) return null;
      fp = fingerprintValue(`text:${normalized}`);
      if (fp === lastFingerprint) return null;
      if (items[0]?.fingerprint === fp) {
        lastFingerprint = fp;
        return null;
      }
      entry = {
        id: crypto.randomUUID(),
        kind: "text",
        text: normalized,
        fingerprint: fp,
        capturedAt: new Date().toISOString(),
        preview: previewForSnapshot({ kind: "text", text: normalized }),
        length: normalized.length,
      };
    } else if (snapshot.kind === "image") {
      const buffer = snapshot.pngBuffer;
      if (!buffer?.length) return null;
      fp = fingerprintValue(`image:${buffer.toString("base64")}`);
      if (fp === lastFingerprint) return null;
      if (items[0]?.fingerprint === fp) {
        lastFingerprint = fp;
        return null;
      }
      const id = crypto.randomUUID();
      const blobPath = saveImageBlob(userDataDir, id, buffer);
      entry = {
        id,
        kind: "image",
        fingerprint: fp,
        capturedAt: new Date().toISOString(),
        preview: previewForSnapshot(snapshot),
        length: buffer.length,
        imageWidth: snapshot.width || 0,
        imageHeight: snapshot.height || 0,
        blobPath,
      };
    } else if (snapshot.kind === "files") {
      const paths = snapshot.paths.filter((entry) => isAbsoluteLocalPath(entry));
      if (!paths.length) return null;
      fp = fingerprintValue(`files:${paths.join("\n")}`);
      if (fp === lastFingerprint) return null;
      if (items[0]?.fingerprint === fp) {
        lastFingerprint = fp;
        return null;
      }
      entry = {
        id: crypto.randomUUID(),
        kind: "files",
        paths,
        fingerprint: fp,
        capturedAt: new Date().toISOString(),
        preview: previewForSnapshot({ kind: "files", paths }),
        length: paths.length,
        fileCount: paths.length,
      };
    }

    if (!entry) return null;
    items.unshift(entry);
    dropOverflow();
    lastFingerprint = fp;
    persist();
    return entry;
  }

  function list() {
    return items.map(({ id, kind, preview, length, capturedAt, fileCount, imageWidth, imageHeight }) => ({
      id,
      kind: kind || "text",
      preview,
      length,
      capturedAt,
      ...(kind === "files" ? { fileCount: fileCount || length } : {}),
      ...(kind === "image" ? { imageWidth, imageHeight } : {}),
    }));
  }

  function get(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return null;
    if (item.kind === "text") {
      return {
        id: item.id,
        kind: "text",
        text: item.text,
        preview: item.preview,
        length: item.length,
        capturedAt: item.capturedAt,
      };
    }
    if (item.kind === "image") {
      return {
        id: item.id,
        kind: "image",
        preview: item.preview,
        length: item.length,
        capturedAt: item.capturedAt,
        imageWidth: item.imageWidth,
        imageHeight: item.imageHeight,
        blobPath: item.blobPath,
      };
    }
    if (item.kind === "files") {
      return {
        id: item.id,
        kind: "files",
        paths: [...item.paths],
        preview: item.preview,
        fileCount: item.fileCount,
        length: item.length,
        capturedAt: item.capturedAt,
      };
    }
    return null;
  }

  load();
  return { observeText, observeSnapshot, list, get, _items: () => items };
}
