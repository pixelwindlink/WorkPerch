import test from "node:test";
import assert from "node:assert/strict";
import { boundsToLocal, unionBounds } from "../../electron/park-frame-geometry.mjs";

test("unionBounds covers both park rectangles with padding", () => {
  const union = unionBounds(
    { x: 200, y: 120, width: 900, height: 700 },
    { x: 1080, y: 38, width: 360, height: 805 },
    12,
  );
  assert.equal(union.x, 188);
  assert.equal(union.y, 26);
  assert.equal(union.width, 1264);
  assert.equal(union.height, 829);
});

test("boundsToLocal expresses screen bounds in overlay coordinates", () => {
  const local = boundsToLocal({ x: 210, y: 50, width: 360, height: 400 }, { x: 200, y: 38 });
  assert.deepEqual(local, { x: 10, y: 12, width: 360, height: 400 });
});
