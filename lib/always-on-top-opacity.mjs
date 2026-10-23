export const ALWAYS_ON_TOP_TRANSPARENCY_MAX_PERCENT = 80;
export const ALWAYS_ON_TOP_OPACITY_TRANSITION_MS = 120;

export function interpolateWindowOpacity(start, target, progress) {
  const t = Math.min(1, Math.max(0, Number(progress) || 0));
  const from = Number(start);
  const to = Number(target);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return to;
  return from + (to - from) * t;
}

export function clampAlwaysOnTopTransparencyPercent(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(ALWAYS_ON_TOP_TRANSPARENCY_MAX_PERCENT, Math.max(0, Math.round(parsed)));
}

/**
 * @param {{ alwaysOnTop: boolean, focused: boolean, pointerInside: boolean, transparencyPercent: number }} state
 * @returns {number} Electron window opacity 0..1
 */
export function resolveAlwaysOnTopWindowOpacity(state) {
  const transparencyPercent = clampAlwaysOnTopTransparencyPercent(state.transparencyPercent, 0);
  if (!state.alwaysOnTop || state.focused || state.pointerInside || transparencyPercent <= 0) {
    return 1;
  }
  const opacity = 1 - transparencyPercent / 100;
  return Math.max(0.15, opacity);
}
