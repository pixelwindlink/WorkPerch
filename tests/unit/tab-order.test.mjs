import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TAB_ORDER, normalizeTabOrder } from "../../ui/tab-order-model.js";

test("normalizeTabOrder fills missing ids and drops unknown entries", () => {
  assert.deepEqual(normalizeTabOrder(["clipboard", "paths"]), ["clipboard", "paths", "notes"]);
  assert.deepEqual(normalizeTabOrder(["paths", "notes", "clipboard", "launcher"]), DEFAULT_TAB_ORDER);
  assert.deepEqual(normalizeTabOrder("not-json"), DEFAULT_TAB_ORDER);
});

test("normalizeTabOrder preserves valid custom order", () => {
  assert.deepEqual(normalizeTabOrder(["notes", "clipboard", "paths"]), ["notes", "clipboard", "paths"]);
});
