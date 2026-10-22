import test from "node:test";
import assert from "node:assert/strict";
import { allocateAutoNoteTitle, isNoteTitleTaken } from "../../ui/note-auto-key.js";

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

test("isNoteTitleTaken is case-insensitive for trimmed titles", () => {
  assert.equal(isNoteTitleTaken(notes, "备忘"), true);
  assert.equal(isNoteTitleTaken(notes, " 备忘 "), true);
  assert.equal(isNoteTitleTaken(notes, "9"), false);
  assert.equal(isNoteTitleTaken(notes, "1", { exceptId: "a" }), false);
});
