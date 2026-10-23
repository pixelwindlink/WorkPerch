import test from "node:test";
import assert from "node:assert/strict";
import { shouldOpenAddPathOnEnter } from "../../ui/path-board-shortcuts.js";

function pathsContext({ panelActive = true, activeTab = "paths" } = {}) {
  const panel = { classList: { contains: (name) => name === "is-active" && panelActive } };
  return {
    documentElement: { dataset: { activeTab } },
    querySelector(selector) {
      if (selector === "#pathsPanel") return panel;
      if (selector === "dialog[open]") return null;
      if (selector === "#summonOverlay") return { hidden: true };
      return null;
    },
    body: { classList: { contains: () => false } },
  };
}

test("shouldOpenAddPathOnEnter only on paths tab without modifiers", () => {
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
  globalThis.document = pathsContext();
  assert.equal(shouldOpenAddPathOnEnter(event), true);
  assert.equal(shouldOpenAddPathOnEnter({ ...event, shiftKey: true }), false);
  globalThis.document = pathsContext({ activeTab: "notes", panelActive: false });
  assert.equal(shouldOpenAddPathOnEnter(event), false);
  globalThis.document = original;
});

test("shouldOpenAddPathOnEnter opens from path search input", () => {
  const doc = pathsContext();
  const target = {
    tagName: "INPUT",
    id: "pathSearch",
    isContentEditable: false,
    closest(selector) {
      if (selector === "#editPathForm") return null;
      return null;
    },
  };
  const original = globalThis.document;
  globalThis.document = doc;
  assert.equal(
    shouldOpenAddPathOnEnter({
      key: "Enter",
      isComposing: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target,
    }),
    true,
  );
  globalThis.document = original;
});
