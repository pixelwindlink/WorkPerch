import test from "node:test";
import assert from "node:assert/strict";
import {
  clipboardLengthTier,
  filterClipboardItems,
  formatClipboardTimestamp,
} from "../../ui/clipboard-format.js";

test("clipboardLengthTier buckets by character count", () => {
  assert.equal(clipboardLengthTier(20).id, "short");
  assert.equal(clipboardLengthTier(200).id, "medium");
  assert.equal(clipboardLengthTier(900).id, "long");
});

test("filterClipboardItems matches preview text", () => {
  const items = [
    { id: "a", preview: "hello world", length: 11 },
    { id: "b", preview: "诊断报告", length: 4 },
  ];
  assert.equal(filterClipboardItems(items, "诊断").length, 1);
  assert.equal(filterClipboardItems(items, "").length, 2);
});

test("formatClipboardTimestamp returns relative or absolute label", () => {
  const recent = formatClipboardTimestamp(new Date(Date.now() - 30_000).toISOString());
  assert.equal(recent, "刚刚");
  const older = formatClipboardTimestamp("2020-01-02T03:04:00.000Z");
  assert.match(older, /2020/);
});
