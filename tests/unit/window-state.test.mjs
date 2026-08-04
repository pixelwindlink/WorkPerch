import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  boundsVisibleOnDisplays,
  captureWindowState,
  readWindowState,
  sanitizeWindowState,
  writeWindowState,
  windowStatePath,
} from "../../electron/window-state.mjs";

test("sanitizeWindowState keeps size within min bounds and drops off-screen positions", () => {
  const displays = [{ workArea: { x: 0, y: 0, width: 1512, height: 982 } }];
  const visible = sanitizeWindowState({ x: 120, y: 80, width: 900, height: 700, maximized: true }, { displays });
  assert.equal(visible.width, 900);
  assert.equal(visible.height, 700);
  assert.equal(visible.x, 120);
  assert.equal(visible.y, 80);
  assert.equal(visible.maximized, true);

  const missing = sanitizeWindowState({ x: -4000, y: -2000, width: 200, height: 100 }, { displays });
  assert.equal(missing.width, 360);
  assert.equal(missing.height, 320);
  assert.equal("x" in missing, false);
  assert.equal("y" in missing, false);
});

test("boundsVisibleOnDisplays uses window center against work areas", () => {
  const displays = [{ workArea: { x: 0, y: 0, width: 1000, height: 800 } }];
  assert.equal(boundsVisibleOnDisplays({ x: 100, y: 100, width: 400, height: 300 }, displays), true);
  assert.equal(boundsVisibleOnDisplays({ x: 5000, y: 100, width: 400, height: 300 }, displays), false);
});

test("window state round-trips through disk and prefers normal bounds when maximized", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-window-state-"));
  const filePath = windowStatePath(root);
  writeWindowState(filePath, sanitizeWindowState({ x: 40, y: 50, width: 1100, height: 800, maximized: false }));
  const loaded = readWindowState(filePath, { displays: [{ workArea: { x: 0, y: 0, width: 1800, height: 1200 } }] });
  assert.equal(loaded.width, 1100);
  assert.equal(loaded.height, 800);
  assert.equal(loaded.x, 40);

  const captured = captureWindowState({
    isMaximized: () => true,
    isFullScreen: () => false,
    getNormalBounds: () => ({ x: 10, y: 20, width: 1280, height: 860 }),
    getBounds: () => ({ x: 0, y: 0, width: 1512, height: 982 }),
  });
  assert.equal(captured.maximized, true);
  assert.equal(captured.width, 1280);
  assert.equal(captured.height, 860);
  assert.equal(captured.x, 10);
});
