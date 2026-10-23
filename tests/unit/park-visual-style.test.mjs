import test from "node:test";
import assert from "node:assert/strict";
import {
  parkChargeLayerCss,
  parkChargeCollapseKeyframes,
  parkChargeMasterKeyframes,
  parkFlightFrozenCss,
  PARK_CHARGE_SHRINK_EASING,
  PARK_FRAME_DURATION_MS,
  PARK_FRAME_TRAVEL_EASING,
} from "../../electron/park-visual-style.mjs";

test("park visual css uses cool rim and eased frame travel", () => {
  assert.equal(PARK_FRAME_DURATION_MS, 392);
  assert.match(parkChargeLayerCss(630, 210, { accent: "#dfff4f" }, 150), /park-charge-appear 150ms/);
  const chargeCss = parkChargeLayerCss(630, 210, { accent: "#dfff4f" }, 150);
  assert.equal(PARK_CHARGE_SHRINK_EASING, "cubic-bezier(0.32, 0.94, 0.28, 1)");
  assert.match(chargeCss, /park-charge 630ms cubic-bezier\(0\.32, 0\.94, 0\.28, 1\)/);
  assert.match(chargeCss, /park-charge-halo 630ms cubic-bezier\(0\.32, 0\.94, 0\.28, 1\)/);
  assert.match(parkChargeLayerCss(630, 210), /#master/);
  assert.match(parkChargeMasterKeyframes(630, 210), /opacity: 0\.5/);
  assert.match(parkChargeCollapseKeyframes({ x: 44, y: 44, width: 360, height: 640 }, { x: 0, y: 0, width: 448, height: 728 }), /park-collapse/);
  assert.match(parkChargeLayerCss(630, 210), /#ring/);
  assert.match(parkFlightFrozenCss({ accent: "#dfff4f" }), /#shell\.is-park-flight/);
  assert.match(parkFlightFrozenCss({ accent: "#dfff4f" }), /color-mix\(in srgb, #dfff4f 50%, transparent\)/);
  assert.match(PARK_FRAME_TRAVEL_EASING, /cubic-bezier/);
});
