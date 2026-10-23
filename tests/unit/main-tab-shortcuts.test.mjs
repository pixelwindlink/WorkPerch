import test from "node:test";
import assert from "node:assert/strict";
import { nextMainPanelTab, shouldSwitchMainPanelOnTab } from "../../ui/main-tab-shortcuts.js";

test("nextMainPanelTab follows tab bar order", () => {
  const order = ["notes", "clipboard", "paths"];
  assert.equal(nextMainPanelTab("notes", order), "clipboard");
  assert.equal(nextMainPanelTab("clipboard", order), "paths");
  assert.equal(nextMainPanelTab("paths", order), "notes");
});

test("shouldSwitchMainPanelOnTab requires plain Tab", () => {
  assert.equal(shouldSwitchMainPanelOnTab({ key: "Tab", shiftKey: false, isComposing: false, target: { closest: () => null } }), true);
  assert.equal(shouldSwitchMainPanelOnTab({ key: "Tab", shiftKey: true, isComposing: false, target: { closest: () => null } }), false);
  assert.equal(shouldSwitchMainPanelOnTab({ key: "Enter", shiftKey: false, target: { closest: () => null } }), false);
});
