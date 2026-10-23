import {
  PIN_EFFECT_DEFAULTS,
  PIN_EFFECT_STORAGE_KEY,
  normalizePinEffectPreferences,
  parkDesktopOptionsFromPinEffects,
} from "../lib/pin-effect-preferences.mjs";
import { storageGet, storageSet } from "./dom.js";

let cached = { ...PIN_EFFECT_DEFAULTS };

export function loadPinEffectPreferences() {
  try {
    const raw = storageGet(PIN_EFFECT_STORAGE_KEY);
    if (!raw) {
      cached = normalizePinEffectPreferences();
      return { ...cached };
    }
    cached = normalizePinEffectPreferences(JSON.parse(raw));
  } catch {
    cached = normalizePinEffectPreferences();
  }
  return { ...cached };
}

export function getPinEffectPreferences() {
  return { ...cached };
}

/** @param {Partial<typeof PIN_EFFECT_DEFAULTS>} partial */
export function savePinEffectPreferences(partial) {
  cached = normalizePinEffectPreferences({ ...cached, ...partial });
  storageSet(PIN_EFFECT_STORAGE_KEY, JSON.stringify(cached));
  return { ...cached };
}

export function pinEffectDesktopOptions() {
  return parkDesktopOptionsFromPinEffects(cached);
}

export {
  PIN_ANIMATION_PRESETS,
  PIN_EFFECT_DEFAULTS,
  normalizePinEffectPreferences,
  alwaysOnTopOpacityDesktopOptions,
} from "../lib/pin-effect-preferences.mjs";
