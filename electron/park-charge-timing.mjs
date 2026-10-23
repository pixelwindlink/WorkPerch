/** Global scale for auto-park press / charge / frame timings. */
export const PARK_TIMING_SCALE = 0.7;

const BASE_PRESS_PARK_MS = 1200;
const BASE_CHARGE_SHOW_DELAY_MS = 300;
const BASE_CHARGE_MASTER_FADE_MS = 300;

export const PARK_PRESS_PARK_MS = Math.round(BASE_PRESS_PARK_MS * PARK_TIMING_SCALE);
export const PARK_CHARGE_SHOW_DELAY_MS = Math.round(BASE_CHARGE_SHOW_DELAY_MS * PARK_TIMING_SCALE);
/** Press timeline: master envelope reaches 50% at (show + fade) ms. */
export const PARK_CHARGE_MASTER_FADE_MS = Math.round(BASE_CHARGE_MASTER_FADE_MS * PARK_TIMING_SCALE);
export const PARK_CHARGE_EXPAND_MS = PARK_PRESS_PARK_MS - PARK_CHARGE_SHOW_DELAY_MS;
/** Opacity fade-in when the charge overlay first appears. */
export const PARK_CHARGE_APPEAR_MS = 150;
/** Rapid collapse of charge glow to window bounds before the frame flies. */
export const PARK_CHARGE_COLLAPSE_MS = 120;
/** Fade out the flight glow after park animation lands. */
export const PARK_FRAME_FADE_OUT_MS = 120;

export function parkTimingForScale(scale = PARK_TIMING_SCALE) {
  const s = Math.min(1.2, Math.max(0.4, Number(scale) || PARK_TIMING_SCALE));
  const pressParkMs = Math.round(BASE_PRESS_PARK_MS * s);
  const showDelayMs = Math.round(BASE_CHARGE_SHOW_DELAY_MS * s);
  const masterFadeMs = Math.round(BASE_CHARGE_MASTER_FADE_MS * s);
  return {
    PARK_PRESS_PARK_MS: pressParkMs,
    PARK_CHARGE_SHOW_DELAY_MS: showDelayMs,
    PARK_CHARGE_MASTER_FADE_MS: masterFadeMs,
    PARK_CHARGE_EXPAND_MS: pressParkMs - showDelayMs,
    PARK_CHARGE_APPEAR_MS,
    PARK_CHARGE_COLLAPSE_MS,
    PARK_FRAME_FADE_OUT_MS,
  };
}
