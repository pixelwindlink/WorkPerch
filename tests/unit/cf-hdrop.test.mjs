import test from "node:test";
import assert from "node:assert/strict";
import { buildCFHdrop, parseCFHdrop } from "../../lib/cf-hdrop.mjs";

test("CF_HDROP round-trips unicode file paths", () => {
  const paths = ["C:\\Users\\demo\\Pictures\\a.png", "C:\\Users\\demo\\doc.txt"];
  const buffer = buildCFHdrop(paths);
  assert.ok(buffer);
  assert.deepEqual(parseCFHdrop(buffer), paths);
});

test("parseCFHdrop rejects invalid buffers", () => {
  assert.deepEqual(parseCFHdrop(Buffer.alloc(8)), []);
});
