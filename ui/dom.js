import { state } from "./state.js";

export const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.4A8 8 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pin: '<path d="m9 4 6 2-1 4 3 3-4 1-3 7-1-7-4-2 4-3V4Z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2h7.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z"/>',
  refresh: '<path d="M20 6v5h-5"/><path d="M19 11a7 7 0 1 0 1 5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  settings: '<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h7M15 17h5"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="17" r="2"/>',
  minimal: '<rect x="4" y="5" width="16" height="5" rx="1.5"/><path d="M4 14h9M4 18h6"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.35 2.35 0 1 1 3.25 2.17c-.72.33-1.05.82-1.05 1.58V13.2"/><path d="M12 17h.01"/>',
};

export const GROUP_COLORS = ["#FF4D6D", "#FF8A00", "#FFD60A", "#22C55E", "#2DD4BF", "#38BDF8", "#6366F1", "#A855F7", "#EC4899", "#F97316"];

export const elements = {
  tabs: [...document.querySelectorAll(".tab")],
  panels: [...document.querySelectorAll(".panel")],
  workspace: document.querySelector(".workspace"),
  pathList: document.querySelector("#pathList"),
  pathEmpty: document.querySelector("#pathEmpty"),
  projectList: document.querySelector("#projectList"),
  projectEmpty: document.querySelector("#projectEmpty"),
  noteList: document.querySelector("#noteList"),
  noteEmpty: document.querySelector("#noteEmpty"),
  editPathDialog: document.querySelector("#editPathDialog"),
  groupRegistryDialog: document.querySelector("#groupRegistryDialog"),
  groupRegistryList: document.querySelector("#groupRegistryList"),
  editNoteDialog: document.querySelector("#editNoteDialog"),
  editProjectDialog: document.querySelector("#editProjectDialog"),
  launchProjectDialog: document.querySelector("#launchProjectDialog"),
  dropBatchDialog: document.querySelector("#dropBatchDialog"),
  legacyDialog: document.querySelector("#legacyMigrationDialog"),
  dropOverlay: document.querySelector("#dropOverlay"),
  toast: document.querySelector("#toast"),
  connectionBanner: document.querySelector("#connectionBanner"),
  alwaysOnTopButton: document.querySelector("#alwaysOnTopButton"),
};

export function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Browser preference storage is best-effort. */ }
}

export function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* Explicit cleanup remains best-effort. */ }
}

export function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalize(value = "") {
  return String(value).trim().toLocaleLowerCase("zh-CN");
}

export function validGroupColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : null;
}

export function derivedGroupColor(group = "未分组") {
  let hash = 0;
  for (const character of String(group || "未分组")) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

export function groupById(id) {
  return state.tags.find((item) => item.id === id);
}

export function groupByName(name) {
  const key = normalize(name || "未分组");
  return state.tags.find((item) => normalize(item.name) === key);
}

export function tagsFor(item) {
  return (item?.tagIds || []).map(groupById).filter(Boolean);
}

export function tagNames(item) {
  return tagsFor(item).map((tag) => tag.name);
}

export function renderTagChips(item) {
  return tagsFor(item).map((tag) => `<span class="group-tag path-group" style="--tag-color:${escapeHtml(tag.color)}">${escapeHtml(tag.name)}</span>`).join("");
}

export function parseTagNames(value) {
  return [...new Set(String(value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean))];
}

export function messageId() {
  return `perch-ui-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`.slice(0, 128);
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function finderFailureMessage(error) {
  const message = String(error?.message || error || "");
  for (const known of [
    "路径不存在或已经被移动。",
    "没有权限访问该路径。",
    "只能在访达中打开绝对路径。",
    "本机路径格式无效。",
    "访达无法打开该目录。",
  ]) {
    if (message.includes(known)) return known;
  }
  return "请确认路径存在且当前用户有访问权限。";
}

export function showToast(message, duration = 1900) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), duration);
}

export function withPreservedWindowScroll(run) {
  const x = window.scrollX;
  const y = window.scrollY;
  run();
  const restore = () => window.scrollTo(x, y);
  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

export function withPreservedElementScroll(element, run) {
  if (!element) {
    run();
    return;
  }
  const top = element.scrollTop;
  const left = element.scrollLeft;
  run();
  element.scrollTop = top;
  element.scrollLeft = left;
  requestAnimationFrame(() => {
    element.scrollTop = top;
    element.scrollLeft = left;
  });
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
