import test from "node:test";
import assert from "node:assert/strict";
import { compactTopRightBounds } from "../../electron/window-park.mjs";

test("compactTopRightBounds pins minimum size flush to work area top-right", () => {
  const bounds = compactTopRightBounds(
    { x: 0, y: 38, width: 1440, height: 862 },
    { width: 360, height: 805, margin: 0 },
  );
  assert.deepEqual(bounds, { x: 1080, y: 38, width: 360, height: 805 });
});
