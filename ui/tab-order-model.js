export const DEFAULT_TAB_ORDER = ["paths", "notes", "clipboard"];

export function normalizeTabOrder(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!Array.isArray(parsed)) return [...DEFAULT_TAB_ORDER];
  const next = [];
  for (const id of parsed) {
    if (DEFAULT_TAB_ORDER.includes(id) && !next.includes(id)) next.push(id);
  }
  for (const id of DEFAULT_TAB_ORDER) {
    if (!next.includes(id)) next.push(id);
  }
  return next.length === DEFAULT_TAB_ORDER.length ? next : [...DEFAULT_TAB_ORDER];
}
