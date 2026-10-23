import test from "node:test";
import assert from "node:assert/strict";
import { chargeOverlayBounds, PARK_CHARGE_GLOW_PAD } from "../../electron/park-frame-geometry.mjs";

test("chargeOverlayBounds pads window bounds for expanding glow", () => {
  const padded = chargeOverlayBounds({ x: 100, y: 80, width: 420, height: 640 });
  assert.equal(PARK_CHARGE_GLOW_PAD, 44);
  assert.equal(padded.x, 100 - PARK_CHARGE_GLOW_PAD);
  assert.equal(padded.y, 80 - PARK_CHARGE_GLOW_PAD);
  assert.equal(padded.width, 420 + PARK_CHARGE_GLOW_PAD * 2);
  assert.equal(padded.height, 640 + PARK_CHARGE_GLOW_PAD * 2);
});
