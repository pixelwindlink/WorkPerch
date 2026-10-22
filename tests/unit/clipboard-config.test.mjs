import test from "node:test";
import assert from "node:assert/strict";
import { CLIPBOARD_HISTORY_LIMIT } from "../../ui/clipboard-config.js";
import { CLIPBOARD_HISTORY_LIMIT as electronLimit } from "../../electron/clipboard-history.mjs";

test("clipboard history limit is shared and set to 100", () => {
  assert.equal(CLIPBOARD_HISTORY_LIMIT, 100);
  assert.equal(electronLimit, CLIPBOARD_HISTORY_LIMIT);
});
