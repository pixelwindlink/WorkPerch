import test from "node:test";
import assert from "node:assert/strict";
import { resolveDesktopPackTarget } from "../../scripts/resolve-desktop-pack-target.mjs";

test("resolveDesktopPackTarget defaults to host platform", () => {
  assert.deepEqual(resolveDesktopPackTarget({}, "darwin"), { platform: "darwin", arch: "arm64" });
  assert.deepEqual(resolveDesktopPackTarget({}, "win32"), { platform: "win32", arch: "x64" });
});

test("resolveDesktopPackTarget honors PERCH_DESKTOP_* overrides", () => {
  assert.deepEqual(
    resolveDesktopPackTarget({ PERCH_DESKTOP_PLATFORM: "win32", PERCH_DESKTOP_ARCH: "x64" }, "darwin"),
    { platform: "win32", arch: "x64" },
  );
});

test("resolveDesktopPackTarget rejects unsupported targets", () => {
  assert.throws(() => resolveDesktopPackTarget({ PERCH_DESKTOP_PLATFORM: "linux" }, "darwin"));
});
