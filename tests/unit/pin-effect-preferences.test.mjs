import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePinEffectPreferences,
  parkDesktopOptionsFromPinEffects,
  timingScaleForPreset,
} from "../../lib/pin-effect-preferences.mjs";

test("normalizePinEffectPreferences clamps timing fields", () => {
  const prefs = normalizePinEffectPreferences({
    longPressMs: 9999,
    chargePreviewDelayMs: 10,
    animationPreset: "unknown",
    effectsEnabled: false,
    frameFadeOutMs: -5,
  });
  assert.equal(prefs.longPressMs, 1400);
  assert.equal(prefs.chargePreviewDelayMs, 80);
  assert.equal(prefs.animationPreset, "balanced");
  assert.equal(prefs.effectsEnabled, false);
  assert.equal(prefs.frameFadeOutMs, 0);
  assert.equal(prefs.alwaysOnTopUnfocusedTransparencyPercent, 0);
});

test("parkDesktopOptionsFromPinEffects maps preset to timing scale", () => {
  assert.equal(timingScaleForPreset("fast"), 0.5);
  assert.deepEqual(parkDesktopOptionsFromPinEffects({ animationPreset: "cinematic" }), {
    effectsEnabled: true,
    timingScale: 1,
    frameFadeOutMs: 120,
  });
});
