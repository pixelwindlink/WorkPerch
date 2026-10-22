import test from "node:test";
import assert from "node:assert/strict";
import {
  insertTextareaNewline,
  shouldInsertNoteValueNewline,
  shouldSubmitNoteFormOnEnter,
} from "../../ui/note-form-keyboard.js";

function noteValueEvent(overrides = {}) {
  const textarea = { id: "editNoteValue", disabled: false, readOnly: false, value: "a", selectionStart: 1, selectionEnd: 1 };
  return {
    key: "Enter",
    isComposing: false,
    keyCode: 13,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: {
      closest(selector) {
        return selector === "#editNoteValue" ? textarea : null;
      },
      ...textarea,
    },
    ...overrides,
  };
}

test("shouldSubmitNoteFormOnEnter on plain Enter in VALUE textarea", () => {
  assert.equal(shouldSubmitNoteFormOnEnter(noteValueEvent()), true);
  assert.equal(shouldSubmitNoteFormOnEnter(noteValueEvent({ metaKey: true })), false);
  assert.equal(shouldSubmitNoteFormOnEnter(noteValueEvent({ shiftKey: true })), false);
});

test("shouldInsertNoteValueNewline on mod+Enter in VALUE textarea", () => {
  assert.equal(shouldInsertNoteValueNewline(noteValueEvent({ metaKey: true })), true);
  assert.equal(shouldInsertNoteValueNewline(noteValueEvent({ ctrlKey: true })), true);
  assert.equal(shouldInsertNoteValueNewline(noteValueEvent()), false);
});

test("insertTextareaNewline inserts at caret", () => {
  const textarea = {
    value: "ab",
    selectionStart: 1,
    selectionEnd: 1,
    dispatchEvent() {},
  };
  insertTextareaNewline(textarea);
  assert.equal(textarea.value, "a\nb");
  assert.equal(textarea.selectionStart, 2);
});
