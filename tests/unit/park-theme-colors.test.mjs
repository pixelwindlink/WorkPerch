import test from "node:test";
import assert from "node:assert/strict";
import { normalizeParkTheme, sanitizeCssHexColor } from "../../electron/park-theme-colors.mjs";
import { parkChargeLayerCss, parkFlightFrozenCss } from "../../electron/park-visual-style.mjs";

test("sanitizeCssHexColor accepts theme accent hex only", () => {
  assert.equal(sanitizeCssHexColor("#cae63d"), "#cae63d");
  assert.equal(sanitizeCssHexColor("red", "#dfff4f"), "#dfff4f");
});

test("park charge glow css uses accent color-mix tokens", () => {
  const css = parkChargeLayerCss(630, 210, normalizeParkTheme({ accent: "#cae63d" }));
  assert.match(css, /color-mix\(in srgb, #cae63d 50%, transparent\)/);
});

test("park flight glow uses the same accent tokens as charge glow", () => {
  const css = parkFlightFrozenCss(normalizeParkTheme({ accent: "#cae63d" }));
  assert.match(css, /color-mix\(in srgb, #cae63d 62%, white 38%\)/);
});
