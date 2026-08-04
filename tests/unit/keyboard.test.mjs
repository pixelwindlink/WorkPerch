import test from "node:test";
import assert from "node:assert/strict";
import { horizontalKeyTarget, isPlainEnterOnSingleLineInput } from "../../ui/keyboard.js";

function keyboardEvent(overrides = {}) {
  const input = {
    type: "text",
    disabled: false,
    readOnly: false,
    ...overrides.input,
  };
  return {
    key: "Enter",
    isComposing: false,
    keyCode: 13,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: { closest: (selector) => selector === "input" ? input : null },
    ...overrides,
  };
}

test("plain Enter submits only from an editable single-line input", () => {
  assert.equal(isPlainEnterOnSingleLineInput(keyboardEvent()), true);
  assert.equal(isPlainEnterOnSingleLineInput(keyboardEvent({ isComposing: true })), false);
  assert.equal(isPlainEnterOnSingleLineInput(keyboardEvent({ metaKey: true })), false);
  assert.equal(isPlainEnterOnSingleLineInput(keyboardEvent({ input: { type: "color" } })), false);
  assert.equal(isPlainEnterOnSingleLineInput(keyboardEvent({ target: { closest: () => null } })), false);
});

test("horizontal component navigation wraps and supports Home or End", () => {
  const buttons = [{ id: "first" }, { id: "middle" }, { id: "last" }];
  assert.equal(horizontalKeyTarget(buttons, buttons[1], "ArrowRight"), buttons[2]);
  assert.equal(horizontalKeyTarget(buttons, buttons[2], "ArrowRight"), buttons[0]);
  assert.equal(horizontalKeyTarget(buttons, buttons[0], "ArrowLeft"), buttons[2]);
  assert.equal(horizontalKeyTarget(buttons, buttons[1], "Home"), buttons[0]);
  assert.equal(horizontalKeyTarget(buttons, buttons[1], "End"), buttons[2]);
  assert.equal(horizontalKeyTarget(buttons, buttons[1], "Enter"), null);
});
