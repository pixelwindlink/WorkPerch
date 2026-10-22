import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createClipboardHistoryStore,
  normalizeClipboardText,
  CLIPBOARD_HISTORY_LIMIT,
} from "../../electron/clipboard-history.mjs";

test("normalizeClipboardText trims and rejects empty", () => {
  assert.equal(normalizeClipboardText("  hi  "), "hi");
  assert.equal(normalizeClipboardText("   "), "");
  assert.equal(normalizeClipboardText(null), "");
});

test("clipboard history dedupes consecutive identical text", () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "perch-clip-")), "history.json");
  const store = createClipboardHistoryStore({ filePath, limit: 5 });
  assert.ok(store.observeText("alpha"));
  assert.equal(store.observeText("alpha"), null);
  assert.equal(store.list().length, 1);
  store.observeText("beta");
  assert.equal(store.list().length, 2);
  assert.equal(store.get(store.list()[0].id).text, "beta");
});

test("clipboard history persists across reload", () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "perch-clip-")), "history.json");
  const first = createClipboardHistoryStore({ filePath, limit: CLIPBOARD_HISTORY_LIMIT });
  first.observeText("persist-me");
  const second = createClipboardHistoryStore({ filePath, limit: CLIPBOARD_HISTORY_LIMIT });
  assert.equal(second.list().length, 1);
  assert.equal(second.get(second.list()[0].id).text, "persist-me");
});
