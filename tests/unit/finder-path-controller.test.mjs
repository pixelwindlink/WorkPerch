import test from "node:test";
import assert from "node:assert/strict";
import {
  FinderPathError,
  MAX_FINDER_PATH_LENGTH,
  assertFinderPath,
  openPathInFinder,
} from "../../electron/finder-path-controller.mjs";

const directoryEntry = { isDirectory: () => true, isFile: () => false };
const fileEntry = { isDirectory: () => false, isFile: () => true };

test("Finder path validation accepts only bounded absolute paths", () => {
  assert.equal(assertFinderPath("/tmp/dashboard-folder"), "/tmp/dashboard-folder");
  for (const value of ["tmp/relative", "", "a\0b", `/tmp/${"a".repeat(MAX_FINDER_PATH_LENGTH)}`]) {
    assert.throws(() => assertFinderPath(value), (error) => error instanceof FinderPathError && error.code === "INVALID_FINDER_PATH");
  }
});

test("Finder controller opens directories without locating or executing files", async () => {
  const opened = [];
  const located = [];
  const result = await openPathInFinder("/tmp/dashboard-folder", {
    stat: async () => directoryEntry,
    openDirectory: async (value) => { opened.push(value); return ""; },
    showItemInFolder: (value) => located.push(value),
  });
  assert.deepEqual(result, { ok: true, kind: "directory" });
  assert.deepEqual(opened, ["/tmp/dashboard-folder"]);
  assert.deepEqual(located, []);
});

test("Finder controller locates files without opening their contents", async () => {
  const opened = [];
  const located = [];
  const result = await openPathInFinder("/tmp/dashboard-file.txt", {
    stat: async () => fileEntry,
    openDirectory: async (value) => { opened.push(value); return ""; },
    showItemInFolder: (value) => located.push(value),
  });
  assert.deepEqual(result, { ok: true, kind: "file" });
  assert.deepEqual(opened, []);
  assert.deepEqual(located, ["/tmp/dashboard-file.txt"]);
});

test("Finder controller maps missing and inaccessible paths to bounded errors", async () => {
  for (const [code, expected] of [["ENOENT", "FINDER_PATH_NOT_FOUND"], ["EACCES", "FINDER_PATH_ACCESS_DENIED"]]) {
    await assert.rejects(
      openPathInFinder("/tmp/unavailable", {
        stat: async () => { throw Object.assign(new Error("private low-level failure"), { code }); },
        openDirectory: async () => "",
        showItemInFolder() {},
      }),
      (error) => error instanceof FinderPathError && error.code === expected && !error.message.includes("private low-level failure"),
    );
  }
});
