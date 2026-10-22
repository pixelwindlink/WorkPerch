import test from "node:test";
import assert from "node:assert/strict";
import { allocateAutoNoteTitle, isNoteTitleTaken, resolveNoteTitleForSave } from "../../ui/note-auto-key.js";

const notes = [
  { id: "a", title: "1" },
  { id: "b", title: "2" },
  { id: "c", title: "备忘" },
];

test("allocateAutoNoteTitle returns next numeric serial", () => {
  assert.equal(allocateAutoNoteTitle(notes), "3");
  assert.equal(allocateAutoNoteTitle([...notes, { id: "d", title: "10" }]), "11");
});

test("allocateAutoNoteTitle continues after highest numeric key", () => {
  assert.equal(allocateAutoNoteTitle([{ id: "x", title: "3" }]), "4");
  assert.equal(allocateAutoNoteTitle([{ id: "x", title: "备忘" }]), "1");
});

test("resolveNoteTitleForSave keeps custom strings or allocates when empty", () => {
  assert.equal(resolveNoteTitleForSave("  需求-1  ", notes), "需求-1");
  assert.equal(resolveNoteTitleForSave("", notes), "3");
  assert.equal(resolveNoteTitleForSave("   ", notes), "3");
});

test("isNoteTitleTaken is case-insensitive for trimmed titles", () => {
  assert.equal(isNoteTitleTaken(notes, "备忘"), true);
  assert.equal(isNoteTitleTaken(notes, " 备忘 "), true);
  assert.equal(isNoteTitleTaken(notes, "9"), false);
  assert.equal(isNoteTitleTaken(notes, "1", { exceptId: "a" }), false);
});
