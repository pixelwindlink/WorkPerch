import test from "node:test";
import assert from "node:assert/strict";
import { shouldOpenAddNoteOnEnter } from "../../ui/note-board-shortcuts.js";

function notesPanelActive(active) {
  const panel = { classList: { contains: (name) => name === "is-active" && active } };
  return {
    querySelector(selector) {
      if (selector === "#notesPanel") return panel;
      if (selector === "dialog[open]") return null;
      if (selector === "#summonOverlay") return { hidden: true };
      return null;
    },
    body: { classList: { contains: () => false } },
  };
}

test("shouldOpenAddNoteOnEnter only on notes panel without modifiers", () => {
  const doc = notesPanelActive(true);
  const event = {
    key: "Enter",
    isComposing: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: { tagName: "DIV", closest: () => null, isContentEditable: false },
  };
  const original = globalThis.document;
  globalThis.document = doc;
  assert.equal(shouldOpenAddNoteOnEnter(event), true);
  assert.equal(shouldOpenAddNoteOnEnter({ ...event, shiftKey: true }), false);
  globalThis.document = notesPanelActive(false);
  assert.equal(shouldOpenAddNoteOnEnter(event), false);
  globalThis.document = original;
});

test("shouldOpenAddNoteOnEnter still opens from note search and filter controls", () => {
  const doc = notesPanelActive(true);
  const base = {
    key: "Enter",
    isComposing: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    isContentEditable: false,
    closest(selector) {
      if (selector === "#editNoteForm") return null;
      return null;
    },
  };
  const original = globalThis.document;
  globalThis.document = doc;
  assert.equal(shouldOpenAddNoteOnEnter({ ...base, target: { ...base, tagName: "INPUT", id: "noteSearch" } }), true);
  assert.equal(shouldOpenAddNoteOnEnter({ ...base, target: { ...base, tagName: "BUTTON", dataset: { lengthFilter: "long" } } }), true);
  globalThis.document = original;
});

test("shouldOpenAddNoteOnEnter ignores note dialog form", () => {
  const doc = notesPanelActive(true);
  const form = { id: "editNoteForm" };
  const target = {
    tagName: "INPUT",
    isContentEditable: false,
    closest(selector) {
      if (selector === "#editNoteForm") return form;
      return null;
    },
  };
  const original = globalThis.document;
  globalThis.document = doc;
  assert.equal(
    shouldOpenAddNoteOnEnter({
      key: "Enter",
      isComposing: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target,
    }),
    false,
  );
  globalThis.document = original;
});
