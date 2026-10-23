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
/** Rapid collapse of charge glow to window bounds before the frame flies. */
export const PARK_CHARGE_COLLAPSE_MS = 120;
