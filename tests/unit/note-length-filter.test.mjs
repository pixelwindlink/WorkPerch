import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOTE_SHORT_MAX_CHARS,
  matchesNoteLengthFilter,
  nextNoteLengthFilter,
  parseNoteLengthFilter,
  parseNoteShortMaxChars,
} from "../../ui/note-length-filter.js";

test("parseNoteLengthFilter accepts only all|short|long", () => {
  assert.equal(parseNoteLengthFilter("all"), "all");
  assert.equal(parseNoteLengthFilter("short"), "short");
  assert.equal(parseNoteLengthFilter("long"), "long");
  assert.equal(parseNoteLengthFilter("bogus"), "all");
});

test("parseNoteShortMaxChars clamps and defaults", () => {
  assert.equal(parseNoteShortMaxChars(undefined), DEFAULT_NOTE_SHORT_MAX_CHARS);
  assert.equal(parseNoteShortMaxChars("50"), 50);
  assert.equal(parseNoteShortMaxChars("0"), 1);
  assert.equal(parseNoteShortMaxChars("99999"), 5000);
});

test("nextNoteLengthFilter cycles all → long → short", () => {
  assert.equal(nextNoteLengthFilter("all", 1), "long");
  assert.equal(nextNoteLengthFilter("long", 1), "short");
  assert.equal(nextNoteLengthFilter("short", 1), "all");
  assert.equal(nextNoteLengthFilter("all", -1), "short");
});

test("matchesNoteLengthFilter uses content length against threshold", () => {
  const max = 100;
  assert.equal(matchesNoteLengthFilter("a".repeat(100), "short", max), true);
  assert.equal(matchesNoteLengthFilter("a".repeat(101), "short", max), false);
  assert.equal(matchesNoteLengthFilter("a".repeat(101), "long", max), true);
  assert.equal(matchesNoteLengthFilter("a".repeat(50), "long", max), false);
  assert.equal(matchesNoteLengthFilter("x", "all", max), true);
});
