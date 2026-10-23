import test from "node:test";
import assert from "node:assert/strict";
import {
  ALWAYS_ON_TOP_OPACITY_TRANSITION_MS,
  clampAlwaysOnTopTransparencyPercent,
  interpolateWindowOpacity,
  resolveAlwaysOnTopWindowOpacity,
} from "../../lib/always-on-top-opacity.mjs";

test("resolveAlwaysOnTopWindowOpacity stays opaque when focused or hovered", () => {
  const base = { alwaysOnTop: true, transparencyPercent: 40 };
  assert.equal(resolveAlwaysOnTopWindowOpacity({ ...base, focused: true, pointerInside: false }), 1);
  assert.equal(resolveAlwaysOnTopWindowOpacity({ ...base, focused: false, pointerInside: true }), 1);
  assert.equal(resolveAlwaysOnTopWindowOpacity({ ...base, focused: false, pointerInside: false }), 0.6);
});

test("resolveAlwaysOnTopWindowOpacity ignores transparency when not pinned or percent is zero", () => {
  assert.equal(
    resolveAlwaysOnTopWindowOpacity({
      alwaysOnTop: false,
      focused: false,
      pointerInside: false,
      transparencyPercent: 50,
    }),
    1,
  );
  assert.equal(
    resolveAlwaysOnTopWindowOpacity({
      alwaysOnTop: true,
      focused: false,
      pointerInside: false,
      transparencyPercent: 0,
    }),
    1,
  );
});

test("clampAlwaysOnTopTransparencyPercent bounds input", () => {
  assert.equal(clampAlwaysOnTopTransparencyPercent(120, 0), 80);
  assert.equal(clampAlwaysOnTopTransparencyPercent(-3, 5), 0);
});

test("opacity transition duration is 120ms", () => {
  assert.equal(ALWAYS_ON_TOP_OPACITY_TRANSITION_MS, 120);
});

test("interpolateWindowOpacity linearly blends start and target", () => {
  assert.equal(interpolateWindowOpacity(1, 0.6, 0), 1);
  assert.equal(interpolateWindowOpacity(1, 0.6, 1), 0.6);
  assert.equal(interpolateWindowOpacity(1, 0.6, 0.5), 0.8);
});
