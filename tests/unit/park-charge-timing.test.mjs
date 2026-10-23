import test from "node:test";
import assert from "node:assert/strict";
import {
  PARK_CHARGE_APPEAR_MS,
  PARK_CHARGE_COLLAPSE_MS,
  PARK_CHARGE_EXPAND_MS,
  PARK_CHARGE_MASTER_FADE_MS,
  PARK_CHARGE_SHOW_DELAY_MS,
  PARK_PRESS_PARK_MS,
  PARK_TIMING_SCALE,
} from "../../electron/park-charge-timing.mjs";

test("park charge timing is scaled to 70% of baseline", () => {
  assert.equal(PARK_TIMING_SCALE, 0.7);
  assert.equal(PARK_CHARGE_SHOW_DELAY_MS, 210);
  assert.equal(PARK_PRESS_PARK_MS, 840);
  assert.equal(PARK_CHARGE_EXPAND_MS, 630);
  assert.equal(PARK_CHARGE_MASTER_FADE_MS, 210);
  assert.equal(PARK_CHARGE_COLLAPSE_MS, 120);
  assert.equal(PARK_CHARGE_APPEAR_MS, 150);
});
