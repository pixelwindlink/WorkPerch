import test from "node:test";
import assert from "node:assert/strict";
import {
  CLIPBOARD_PANEL_BODY_MIN_HEIGHT_PX,
  CLIPBOARD_TOTAL_CONTENT_ROWS,
  minWindowHeightForClipboardPanelPx,
} from "../../clipboard-panel-layout.mjs";

test("clipboard panel reserves 25 row heights with 15 list + 10 detail", () => {
  assert.equal(CLIPBOARD_TOTAL_CONTENT_ROWS, 25);
  assert.equal(CLIPBOARD_PANEL_BODY_MIN_HEIGHT_PX, 22 + 25 * 24);
  assert.equal(minWindowHeightForClipboardPanelPx(), 805);
});
