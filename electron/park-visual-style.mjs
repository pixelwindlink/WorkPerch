/** Visual tokens aligned with WorkPerch guide-spotlight / cool charcoal palette. */
export const PARK_SHELL_RADIUS_PX = 11;
export const PARK_FRAME_DURATION_MS = Math.round(560 * 0.7);
export const PARK_FRAME_FINISH_PAD_MS = Math.round(140 * 0.7);
export const PARK_FRAME_TRAVEL_EASING = "cubic-bezier(0.22, 0.98, 0.32, 1)";

export function parkOverlayBaseCss() {
  return `
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  `;
}

export function parkChargeMasterKeyframes(expandDurationMs, masterFadeDurationMs) {
  const fadeEndPercent = expandDurationMs > 0
    ? Math.min(100, (masterFadeDurationMs / expandDurationMs) * 100)
    : 100;
  return `
  @keyframes park-charge-master {
    0% { opacity: 1; }
    ${fadeEndPercent}% { opacity: 0.5; }
    100% { opacity: 0.5; }
  }
  `;
}

export function parkChargeLayerCss(durationMs, masterFadeDurationMs) {
  return `
  #shell {
    position: absolute;
    box-sizing: border-box;
    border-radius: ${PARK_SHELL_RADIUS_PX}px;
    pointer-events: none;
    transform: translateZ(0);
    animation: park-charge ${durationMs}ms linear forwards;
    will-change: left, top, width, height;
  }
  #master {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 1;
    animation: park-charge-master ${durationMs}ms linear forwards;
    will-change: opacity;
  }
  #ring {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(237, 240, 242, 0.42);
    box-shadow:
      0 0 0 1px rgba(10, 132, 255, 0.1),
      inset 0 0 0 1px rgba(237, 240, 242, 0.06);
    opacity: 0.85;
  }
  #halo {
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: radial-gradient(
      ellipse at center,
      rgba(237, 240, 242, 0.5) 0%,
      rgba(198, 210, 228, 0.34) 52%,
      rgba(117, 167, 255, 0.28) 100%
    );
    mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    filter: blur(10px);
    opacity: 0.55;
    animation: park-charge-halo ${durationMs}ms linear forwards;
  }
  @keyframes park-charge-halo {
    0% { opacity: 0.42; filter: blur(8px); transform: scale(0.992); }
    100% { opacity: 0.92; filter: blur(16px); transform: scale(1.02); }
  }
  `;
}

export function parkChargeCollapseKeyframes(tight, expanded) {
  const esc = (value) => String(value);
  return `
  @keyframes park-collapse {
    from {
      left: ${esc(expanded.x)}px;
      top: ${esc(expanded.y)}px;
      width: ${esc(expanded.width)}px;
      height: ${esc(expanded.height)}px;
    }
    to {
      left: ${esc(tight.x)}px;
      top: ${esc(tight.y)}px;
      width: ${esc(tight.width)}px;
      height: ${esc(tight.height)}px;
    }
  }
  `;
}

export function parkChargeKeyframes(from, end) {
  const esc = (value) => String(value);
  return `
  @keyframes park-charge {
    0% {
      left: ${esc(from.x)}px;
      top: ${esc(from.y)}px;
      width: ${esc(from.width)}px;
      height: ${esc(from.height)}px;
    }
    100% {
      left: ${esc(end.x)}px;
      top: ${esc(end.y)}px;
      width: ${esc(end.width)}px;
      height: ${esc(end.height)}px;
    }
  }
  `;
}

export function parkFrameShellLayerCss(durationMs) {
  return parkFrameLayerCss(durationMs, "shell.is-frame", "park-frame-shell");
}

export function parkFrameLayerCss(durationMs, selector = "box", animationName = "park-frame") {
  return `
  #${selector} {
    position: absolute;
    box-sizing: border-box;
    border-radius: ${PARK_SHELL_RADIUS_PX}px;
    border: 1px solid rgba(237, 240, 242, 0.58);
    background: rgba(14, 16, 18, 0.06);
    box-shadow:
      0 0 0 1px rgba(10, 132, 255, 0.16),
      0 0 22px rgba(117, 167, 255, 0.14),
      inset 0 0 28px rgba(237, 240, 242, 0.05);
    animation: ${animationName} ${durationMs}ms ${PARK_FRAME_TRAVEL_EASING} forwards;
    will-change: left, top, width, height;
    transform: translateZ(0);
    pointer-events: none;
  }
  `;
}

export function parkFrameShellKeyframes(from, to) {
  return parkFrameKeyframes(from, to, "park-frame-shell");
}

export function parkFrameKeyframes(from, to, animationName = "park-frame") {
  const esc = (value) => String(value);
  const bouncePad = 2;
  return `
  @keyframes ${animationName} {
    0% {
      left: ${esc(from.x)}px;
      top: ${esc(from.y)}px;
      width: ${esc(from.width)}px;
      height: ${esc(from.height)}px;
      opacity: 0.92;
    }
    88% {
      left: ${esc(to.x)}px;
      top: ${esc(to.y)}px;
      width: ${esc(to.width)}px;
      height: ${esc(to.height)}px;
      opacity: 1;
    }
    94% {
      left: ${esc(to.x - bouncePad)}px;
      top: ${esc(to.y - bouncePad)}px;
      width: ${esc(to.width + bouncePad * 2)}px;
      height: ${esc(to.height + bouncePad * 2)}px;
      opacity: 1;
    }
    100% {
      left: ${esc(to.x)}px;
      top: ${esc(to.y)}px;
      width: ${esc(to.width)}px;
      height: ${esc(to.height)}px;
      opacity: 0.96;
    }
  }
  `;
}
