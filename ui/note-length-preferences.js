import { STORAGE_KEYS, state } from "./state.js";
import { storageGet, storageSet } from "./dom.js";
import { nextNoteLengthFilter, parseNoteLengthFilter, parseNoteShortMaxChars } from "./note-length-filter.js";
import { syncNoteLengthFilterButtons, syncNoteShortThresholdIcon } from "./note-length-filter-ui.js";

export function loadNoteLengthPreferences() {
  state.noteLengthFilter = parseNoteLengthFilter(storageGet(STORAGE_KEYS.noteLengthFilter));
  state.noteShortMaxChars = parseNoteShortMaxChars(storageGet(STORAGE_KEYS.noteShortMaxChars));
  syncNoteShortThresholdIcon();
  syncNoteLengthFilterButtons();
}

export function persistNoteLengthFilter(mode) {
  state.noteLengthFilter = parseNoteLengthFilter(mode);
  storageSet(STORAGE_KEYS.noteLengthFilter, state.noteLengthFilter);
}

export function cycleNoteLengthFilter(step = 1) {
  const next = nextNoteLengthFilter(state.noteLengthFilter, step);
  persistNoteLengthFilter(next);
  return next;
}

export function persistNoteShortMaxChars(raw) {
  state.noteShortMaxChars = parseNoteShortMaxChars(raw);
  storageSet(STORAGE_KEYS.noteShortMaxChars, String(state.noteShortMaxChars));
}
