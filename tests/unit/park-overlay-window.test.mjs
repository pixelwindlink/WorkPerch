import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const overlaySource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../electron/park-overlay-window.mjs"),
  "utf8",
);
const chargeSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../electron/park-charge-overlay.mjs"),
  "utf8",
);

test("park overlay stacking supports above-owner and below-owner modes", () => {
  assert.match(overlaySource, /stacking === "below"/);
  assert.match(overlaySource, /alwaysOnTop: !belowOwner/);
  assert.match(chargeSource, /stacking: "above"/);
});
