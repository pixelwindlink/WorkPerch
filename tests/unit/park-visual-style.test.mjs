import test from "node:test";
import assert from "node:assert/strict";
import {
  parkChargeLayerCss,
  parkChargeCollapseKeyframes,
  parkChargeMasterKeyframes,
  parkFrameLayerCss,
  PARK_FRAME_DURATION_MS,
  PARK_FRAME_TRAVEL_EASING,
} from "../../electron/park-visual-style.mjs";

test("park visual css uses cool rim and eased frame travel", () => {
  assert.equal(PARK_FRAME_DURATION_MS, 392);
  assert.match(parkChargeLayerCss(630, 210), /rgba\(117, 167, 255/);
  assert.match(parkChargeLayerCss(630, 210), /#master/);
  assert.match(parkChargeMasterKeyframes(630, 210), /opacity: 0\.5/);
  assert.match(parkChargeCollapseKeyframes({ x: 44, y: 44, width: 360, height: 640 }, { x: 0, y: 0, width: 448, height: 728 }), /park-collapse/);
  assert.match(parkChargeLayerCss(630, 210), /#ring/);
  assert.match(parkFrameLayerCss(392), /rgba\(10, 132, 255/);
  assert.match(PARK_FRAME_TRAVEL_EASING, /cubic-bezier/);
});
