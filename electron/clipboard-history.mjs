import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CLIPBOARD_HISTORY_LIMIT = 200;
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

export function createClipboardHistoryStore({ filePath, limit = CLIPBOARD_HISTORY_LIMIT } = {}) {
  let lastFingerprint = "";
  let items = [];

  function load() {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      items = Array.isArray(raw.items) ? raw.items.filter((item) => item?.id && typeof item.text === "string").slice(0, limit) : [];
      lastFingerprint = typeof raw.lastFingerprint === "string" ? raw.lastFingerprint : "";
    } catch {
      items = [];
      lastFingerprint = "";
    }
  }

  function persist() {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const payload = `${JSON.stringify({ version: 1, lastFingerprint, items }, null, 2)}\n`;
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, payload, "utf8");
    fs.renameSync(tempPath, filePath);
  }

  function fingerprint(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  function observeText(text) {
    const normalized = normalizeClipboardText(text);
    if (!normalized) return null;
    const fp = fingerprint(normalized);
    if (fp === lastFingerprint) return null;
    if (items[0] && items[0].fingerprint === fp) {
      lastFingerprint = fp;
      return null;
    }
    const entry = {
      id: crypto.randomUUID(),
      text: normalized,
      fingerprint: fp,
      capturedAt: new Date().toISOString(),
      preview: normalized.length > 240 ? `${normalized.slice(0, 240)}…` : normalized,
      length: normalized.length,
    };
    items.unshift(entry);
    if (items.length > limit) items.length = limit;
    lastFingerprint = fp;
    persist();
    return entry;
  }

  function list() {
    return items.map(({ id, preview, length, capturedAt }) => ({ id, preview, length, capturedAt }));
  }

  function get(id) {
    return items.find((item) => item.id === id) || null;
  }

  load();
  return { observeText, list, get, _items: () => items };
}
