import test from "node:test";
import assert from "node:assert/strict";
import { computeOverflowPanelPosition } from "../../ui/header-layout.js";

test("overflow panel stays inside viewport when anchor is near the left edge", () => {
  const anchor = { left: 12, right: 40, top: 8, bottom: 36 };
  const panel = { width: 148, height: 120 };
  const placed = computeOverflowPanelPosition(anchor, panel, { width: 360, height: 800 });
  assert.equal(placed.left, 8);
  assert.equal(placed.top, 42);
});

test("overflow panel aligns to anchor right edge when there is room", () => {
  const anchor = { left: 280, right: 308, top: 8, bottom: 36 };
  const panel = { width: 148, height: 120 };
  const placed = computeOverflowPanelPosition(anchor, panel, { width: 360, height: 800 });
  assert.equal(placed.left, 160);
});
