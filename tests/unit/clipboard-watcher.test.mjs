import test from "node:test";
import assert from "node:assert/strict";
import { createClipboardWatcher } from "../../electron/clipboard-watcher.mjs";

test("clipboard watcher notifies immediately on start tick", () => {
  const changes = [];
  const watcher = createClipboardWatcher({
    intervals: { idle: 60_000, active: 60_000 },
    observeClipboardText: () => ({ id: "clip-1" }),
    onHistoryChanged(entry) {
      changes.push(entry.id);
    },
  });
  watcher.start();
  assert.deepEqual(changes, ["clip-1"]);
  watcher.stop();
});

test("clipboard watcher setPanelActive triggers an immediate tick", () => {
  let reads = 0;
  const watcher = createClipboardWatcher({
    intervals: { idle: 60_000, active: 60_000 },
    observeClipboardText() {
      reads += 1;
      return null;
    },
    onHistoryChanged() {},
  });
  watcher.start();
  const afterStart = reads;
  watcher.setPanelActive(true);
  assert.equal(reads, afterStart + 1);
  watcher.stop();
});
