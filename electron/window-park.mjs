/**
 * One-shot compact park: minimum window size flush to the display work-area top-right.
 */
export function resolveCompactTopRightBounds(anchorBounds, getDisplayMatching, getDisplayNearestPoint, { width, height, margin = 0 } = {}) {
  let display = getDisplayMatching(anchorBounds);
  let next = compactTopRightBounds(display.workArea, { width, height, margin });
  display = getDisplayNearestPoint({ x: next.x + next.width - 1, y: next.y });
  return compactTopRightBounds(display.workArea, { width, height, margin });
}

export function compactTopRightBounds(workArea, { width, height, margin = 0 } = {}) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const area = workArea || { x: 0, y: 0, width: w, height: h };
  const x = area.x + Math.max(0, area.width - w - Math.max(0, margin));
  const y = area.y + Math.max(0, margin);
  return { x: Math.round(x), y: Math.round(y), width: w, height: h };
}
