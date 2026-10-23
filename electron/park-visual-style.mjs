/** Visual tokens aligned with WorkPerch guide-spotlight / cool charcoal palette. */
export const PARK_SHELL_RADIUS_PX = 11;
export const PARK_FRAME_DURATION_MS = Math.round(560 * 0.7);
export const PARK_FRAME_FINISH_PAD_MS = Math.round(140 * 0.7);
export const PARK_FRAME_TRAVEL_EASING = "cubic-bezier(0.22, 0.98, 0.32, 1)";
/** Fade-in accelerates toward full opacity (ease-in). */
export const PARK_CHARGE_APPEAR_EASING = "cubic-bezier(0.55, 0.06, 0.85, 0.25)";
/** Inward shrink eases in then settles (strong ease-out). */
export const PARK_CHARGE_SHRINK_EASING = "cubic-bezier(0.32, 0.94, 0.28, 1)";

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

function escCssColor(value) {
  return String(value).replace(/["\\]/g, "");
}

export function parkChargeAppearKeyframes(appearMs) {
  return `
  @keyframes park-charge-appear {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  `;
}

export function parkChargeLayerCss(durationMs, masterFadeDurationMs, theme = {}, appearMs = 150) {
  const accent = escCssColor(theme.accent || "#dfff4f");
  return `
  ${parkChargeAppearKeyframes(appearMs)}
  #shell {
    position: absolute;
    box-sizing: border-box;
    border-radius: ${PARK_SHELL_RADIUS_PX}px;
    pointer-events: none;
    transform: translateZ(0);
    animation: park-charge ${durationMs}ms ${PARK_CHARGE_SHRINK_EASING} forwards;
    will-change: left, top, width, height;
  }
  #fade {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    animation: park-charge-appear ${appearMs}ms ${PARK_CHARGE_APPEAR_EASING} forwards;
    will-change: opacity;
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
    border: 1px solid color-mix(in srgb, ${accent} 62%, white 38%);
    box-shadow:
      0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent),
      inset 0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent);
    opacity: 0.85;
  }
  #halo {
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: radial-gradient(
      ellipse at center,
      color-mix(in srgb, ${accent} 50%, transparent) 0%,
      color-mix(in srgb, ${accent} 72%, transparent) 52%,
      color-mix(in srgb, ${accent} 100%, transparent) 100%
    );
    mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    filter: blur(10px);
    opacity: 0.55;
    animation: park-charge-halo ${durationMs}ms ${PARK_CHARGE_SHRINK_EASING} forwards;
  }
  @keyframes park-charge-halo {
    0% { opacity: 0.88; filter: blur(18px); transform: scale(1.03); }
    100% { opacity: 0.48; filter: blur(9px); transform: scale(1); }
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

function parkGlowAccentLayersCss(accent) {
  return `
  #ring {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid color-mix(in srgb, ${accent} 62%, white 38%);
    box-shadow:
      0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent),
      inset 0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent);
    opacity: 0.85;
  }
  #halo {
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: radial-gradient(
      ellipse at center,
      color-mix(in srgb, ${accent} 50%, transparent) 0%,
      color-mix(in srgb, ${accent} 72%, transparent) 52%,
      color-mix(in srgb, ${accent} 100%, transparent) 100%
    );
    mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 1) 72%);
    filter: blur(9px);
    opacity: 0.48;
    transform: scale(1);
  }
  `;
}

/** Frozen charge-end glow used as the park flight carrier (no wireframe). */
export function parkFlightFrozenCss(theme = {}) {
  const accent = escCssColor(theme.accent || "#dfff4f");
  return `
  #shell.is-park-flight {
    position: absolute;
    box-sizing: border-box;
    border-radius: ${PARK_SHELL_RADIUS_PX}px;
    pointer-events: none;
    transform: translateZ(0);
    will-change: left, top, width, height;
  }
  #shell.is-park-flight #fade {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 1;
  }
  #shell.is-park-flight #master {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0.5;
  }
  ${parkGlowAccentLayersCss(accent)}
  `;
}

export function parkFlightShellKeyframes(from, to) {
  return parkFlightKeyframes(from, to);
}

export function parkFlightKeyframes(from, to, animationName = "park-flight") {
  const esc = (value) => String(value);
  const bouncePad = 2;
  return `
  @keyframes ${animationName} {
    0% {
      left: ${esc(from.x)}px;
      top: ${esc(from.y)}px;
      width: ${esc(from.width)}px;
      height: ${esc(from.height)}px;
    }
    88% {
      left: ${esc(to.x)}px;
      top: ${esc(to.y)}px;
      width: ${esc(to.width)}px;
      height: ${esc(to.height)}px;
    }
    94% {
      left: ${esc(to.x - bouncePad)}px;
      top: ${esc(to.y - bouncePad)}px;
      width: ${esc(to.width + bouncePad * 2)}px;
      height: ${esc(to.height + bouncePad * 2)}px;
    }
    100% {
      left: ${esc(to.x)}px;
      top: ${esc(to.y)}px;
      width: ${esc(to.width)}px;
      height: ${esc(to.height)}px;
    }
  }
  `;
}

export function parkFlightFadeOutKeyframes(animationName = "park-flight-fade-out") {
  return `
  @keyframes ${animationName} {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  `;
}

export function parkFlightBodyHtml() {
  return `<div id="shell" class="is-park-flight" aria-hidden="true">
    <div id="fade"><div id="master"><div id="halo"></div><div id="ring"></div></div></div>
  </div>`;
}
