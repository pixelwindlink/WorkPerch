import test from "node:test";
import assert from "node:assert/strict";
import { isExternalPathDropDrag } from "../../ui/drag-path-drop.js";

function types(...list) {
  return { types: list };
}

test("isExternalPathDropDrag ignores tab reorder drags", () => {
  assert.equal(isExternalPathDropDrag(types("text/plain", "text/tab-id")), false);
  assert.equal(isExternalPathDropDrag(types("text/tab-id")), false);
});

test("isExternalPathDropDrag accepts external file drags", () => {
  assert.equal(isExternalPathDropDrag(types("Files")), true);
  assert.equal(isExternalPathDropDrag(types("text/uri-list")), true);
});

test("isExternalPathDropDrag ignores plain text alone", () => {
  assert.equal(isExternalPathDropDrag(types("text/plain")), false);
});
