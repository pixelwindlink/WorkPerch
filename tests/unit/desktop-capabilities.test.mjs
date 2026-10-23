import test from "node:test";
import assert from "node:assert/strict";
import { getDesktopCapabilities } from "../../electron/desktop-capabilities.mjs";

test("getDesktopCapabilities enables clipboard files on darwin and win32", () => {
  assert.equal(getDesktopCapabilities("darwin").clipboardFiles, true);
  assert.equal(getDesktopCapabilities("win32").clipboardFiles, true);
  assert.equal(getDesktopCapabilities("linux").clipboardFiles, false);
});

test("external window layouts remain macOS-only", () => {
  assert.equal(getDesktopCapabilities("darwin").externalWindowLayouts, true);
  assert.equal(getDesktopCapabilities("win32").externalWindowLayouts, false);
});
