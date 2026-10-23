import test from "node:test";
import assert from "node:assert/strict";
import { clipboardRowMeta, filterClipboardItems } from "../../ui/clipboard-format.js";

test("clipboardRowMeta labels image and files", () => {
  const image = clipboardRowMeta({
    kind: "image",
    imageWidth: 100,
    imageHeight: 50,
    capturedAt: new Date().toISOString(),
  });
  assert.match(image, /图片·100×50/);
  const files = clipboardRowMeta({
    kind: "files",
    fileCount: 3,
    length: 3,
    capturedAt: new Date().toISOString(),
  });
  assert.match(files, /文件·3 项/);
});

test("filterClipboardItems matches kind label", () => {
  const items = [
    { id: "1", kind: "text", preview: "hello", length: 5 },
    { id: "2", kind: "image", preview: "图片 10×10", length: 100 },
  ];
  assert.equal(filterClipboardItems(items, "图片").length, 1);
});
