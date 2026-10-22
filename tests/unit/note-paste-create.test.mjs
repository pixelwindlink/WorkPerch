import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeClipboardNoteContent,
  NOTE_CONTENT_MAX_LENGTH,
  suggestNoteTitleFromClipboard,
  shouldCreateNoteFromPaste,
} from "../../ui/note-paste-create.js";

function pasteEvent(overrides = {}) {
  return {
    key: "v",
    metaKey: false,
    ctrlKey: true,
    altKey: false,
    isComposing: false,
    target: { tagName: "BODY", closest: () => null, isContentEditable: false },
    ...overrides,
  };
}

test("suggestNoteTitleFromClipboard uses first non-empty line", () => {
  assert.equal(suggestNoteTitleFromClipboard("hello\nworld"), "hello");
  assert.equal(suggestNoteTitleFromClipboard("  \n\tline two"), "line two");
});

test("suggestNoteTitleFromClipboard falls back to timestamp label", () => {
  const title = suggestNoteTitleFromClipboard("   \n  ", new Date("2026-10-22T10:15:00"));
  assert.equal(title, "粘贴 2026-10-22 10:15");
});

test("shouldCreateNoteFromPaste only on notes tab with mod+v outside inputs", () => {
  assert.equal(shouldCreateNoteFromPaste(pasteEvent(), "notes"), true);
  assert.equal(shouldCreateNoteFromPaste(pasteEvent(), "paths"), false);
  assert.equal(shouldCreateNoteFromPaste(pasteEvent({ metaKey: true, ctrlKey: false }), "notes"), true);
  assert.equal(shouldCreateNoteFromPaste(pasteEvent({ target: { tagName: "INPUT", closest: () => null, isContentEditable: false } }), "notes"), false);
  assert.equal(shouldCreateNoteFromPaste(pasteEvent({
    target: {
      tagName: "DIV",
      closest: (sel) => (sel === "dialog[open], #summonOverlay" ? {} : null),
      isContentEditable: false,
    },
  }), "notes"), false);
});

test("normalizeClipboardNoteContent trims and truncates", () => {
  assert.deepEqual(normalizeClipboardNoteContent("  hi "), { content: "hi", truncated: false });
  assert.deepEqual(normalizeClipboardNoteContent("   "), { content: "", truncated: false });
  const long = "a".repeat(NOTE_CONTENT_MAX_LENGTH + 5);
  const result = normalizeClipboardNoteContent(long);
  assert.equal(result.content.length, NOTE_CONTENT_MAX_LENGTH);
  assert.equal(result.truncated, true);
});
