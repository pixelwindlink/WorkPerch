import test from "node:test";
import assert from "node:assert/strict";
import { noteIdFromDoubleClickTarget } from "../../ui/note-double-click.js";

function target({ tagName = "DIV", closestResult = null, closest = null } = {}) {
  const closestFn = closest || ((selector) => {
    if (selector === ".note-item-actions" && closestResult?.inActions) return closestResult.inActions;
    if (selector === ".note-item[data-id]") return closestResult?.row || null;
    return null;
  });
  return { tagName, closest: closestFn };
}

test("noteIdFromDoubleClickTarget resolves note row id", () => {
  const row = { dataset: { id: "n-1" } };
  assert.equal(noteIdFromDoubleClickTarget(target({ closestResult: { row } })), "n-1");
});

test("noteIdFromDoubleClickTarget ignores action buttons", () => {
  const row = { dataset: { id: "n-1" } };
  assert.equal(
    noteIdFromDoubleClickTarget(target({ closestResult: { row, inActions: { tagName: "BUTTON" } } })),
    null,
  );
});
