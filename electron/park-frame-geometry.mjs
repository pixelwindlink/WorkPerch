export function unionBounds(a, b, pad = 12) {
  const x = Math.min(a.x, b.x) - pad;
  const y = Math.min(a.y, b.y) - pad;
  const right = Math.max(a.x + a.width, b.x + b.width) + pad;
  const bottom = Math.max(a.y + a.height, b.y + b.height) + pad;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(right - x)),
    height: Math.max(1, Math.round(bottom - y)),
  };
}

export const PARK_CHARGE_GLOW_PAD = 44;

export function chargeOverlayBounds(windowBounds, pad = PARK_CHARGE_GLOW_PAD) {
  return {
    x: Math.round(windowBounds.x - pad),
    y: Math.round(windowBounds.y - pad),
    width: Math.round(windowBounds.width + pad * 2),
    height: Math.round(windowBounds.height + pad * 2),
  };
}

export function boundsToLocal(bounds, origin) {
  return {
    x: Math.round(bounds.x - origin.x),
    y: Math.round(bounds.y - origin.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
}
