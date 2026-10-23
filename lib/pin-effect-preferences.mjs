/** @typedef {"fast" | "balanced" | "cinematic"} PinAnimationPreset */

import { clampAlwaysOnTopTransparencyPercent } from "./always-on-top-opacity.mjs";

export const PIN_EFFECT_STORAGE_KEY = "local-perch.pin-effects.v1";

export const PIN_ANIMATION_PRESETS = Object.freeze({
  fast: Object.freeze({ id: "fast", label: "轻快", scale: 0.5 }),
  balanced: Object.freeze({ id: "balanced", label: "默认", scale: 0.7 }),
  cinematic: Object.freeze({ id: "cinematic", label: "完整", scale: 1 }),
});

export const PIN_EFFECT_DEFAULTS = Object.freeze({
  longPressMs: 840,
  chargePreviewDelayMs: 210,
  animationPreset: "balanced",
  effectsEnabled: true,
  frameFadeOutMs: 120,
  /** Unfocused always-on-top transparency (0 = fully opaque). */
  alwaysOnTopUnfocusedTransparencyPercent: 0,
});

const PRESET_IDS = new Set(Object.keys(PIN_ANIMATION_PRESETS));

export function clampPinEffectNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/** @param {unknown} raw */
export function normalizePinAnimationPreset(raw) {
  const id = String(raw ?? "").trim();
  return PRESET_IDS.has(id) ? id : PIN_EFFECT_DEFAULTS.animationPreset;
}

/** @param {Partial<typeof PIN_EFFECT_DEFAULTS>} [partial] */
export function normalizePinEffectPreferences(partial = {}) {
  const preset = normalizePinAnimationPreset(partial.animationPreset);
  return {
    longPressMs: clampPinEffectNumber(partial.longPressMs, 500, 1400, PIN_EFFECT_DEFAULTS.longPressMs),
    chargePreviewDelayMs: clampPinEffectNumber(
      partial.chargePreviewDelayMs,
      80,
      500,
      PIN_EFFECT_DEFAULTS.chargePreviewDelayMs,
    ),
    animationPreset: preset,
    effectsEnabled: partial.effectsEnabled !== false,
    frameFadeOutMs: clampPinEffectNumber(partial.frameFadeOutMs, 0, 400, PIN_EFFECT_DEFAULTS.frameFadeOutMs),
    alwaysOnTopUnfocusedTransparencyPercent: clampAlwaysOnTopTransparencyPercent(
      partial.alwaysOnTopUnfocusedTransparencyPercent,
      PIN_EFFECT_DEFAULTS.alwaysOnTopUnfocusedTransparencyPercent,
    ),
  };
}

export function alwaysOnTopOpacityDesktopOptions(prefs) {
  const normalized = normalizePinEffectPreferences(prefs);
  return {
    transparencyPercent: normalized.alwaysOnTopUnfocusedTransparencyPercent,
  };
}

export function timingScaleForPreset(presetId) {
  return PIN_ANIMATION_PRESETS[normalizePinAnimationPreset(presetId)].scale;
}

export function parkDesktopOptionsFromPinEffects(prefs) {
  const normalized = normalizePinEffectPreferences(prefs);
  return {
    effectsEnabled: normalized.effectsEnabled,
    timingScale: timingScaleForPreset(normalized.animationPreset),
    frameFadeOutMs: normalized.frameFadeOutMs,
  };
}
