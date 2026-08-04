import { state } from "./state.js";
import { escapeHtml, normalize, tagNames, showToast } from "./dom.js";
import { openLocalPathInFinder } from "./desktop.js";
import { revealExistingPath } from "./render-paths.js";
import { revealExistingProject } from "./render-projects.js";

let activeIndex = 0;
let currentHits = [];

function overlay() {
  return document.querySelector("#summonOverlay");
}

function input() {
  return document.querySelector("#summonSearch");
}

function list() {
  return document.querySelector("#summonResults");
}

function byRecent(items) {
  return [...items].sort((a, b) => {
    const aUsed = a.usage?.lastUsedAt ? Date.parse(a.usage.lastUsedAt) : 0;
    const bUsed = b.usage?.lastUsedAt ? Date.parse(b.usage.lastUsedAt) : 0;
    return bUsed - aUsed || (b.usage?.count || 0) - (a.usage?.count || 0) || (a.name || "").localeCompare(b.name || "", "zh-CN");
  });
}

function matchText(item, kind) {
  return normalize([
    item.name,
    item.path,
    item.description,
    item.label,
    ...tagNames(item),
    kind,
  ].filter(Boolean).join(" "));
}

function buildHits(query) {
  const q = normalize(query);
  const pathItems = byRecent(state.paths).map((item) => ({ kind: "path", item }));
  const projectItems = byRecent(state.projects).map((item) => ({ kind: "project", item }));
  const combined = [...pathItems, ...projectItems];
  const filtered = q
    ? combined.filter((entry) => matchText(entry.item, entry.kind).includes(q))
    : combined.filter((entry) => entry.item.usage?.lastUsedAt || (entry.item.usage?.count || 0) > 0).slice(0, 12);
  if (!q && filtered.length < 8) {
    const seen = new Set(filtered.map((entry) => `${entry.kind}:${entry.item.id}`));
    for (const entry of combined) {
      const key = `${entry.kind}:${entry.item.id}`;
      if (seen.has(key)) continue;
      filtered.push(entry);
      seen.add(key);
      if (filtered.length >= 12) break;
    }
  }
  return filtered.slice(0, 20);
}

function renderHits() {
  const root = list();
  if (!root) return;
  if (!currentHits.length) {
    root.innerHTML = `<div class="summon-empty">${state.connected ? "没有匹配的路径或项目" : "请先连接 Dashboard Engine"}</div>`;
    return;
  }
  root.innerHTML = currentHits.map((entry, index) => {
    const { item, kind } = entry;
    const active = index === activeIndex ? " is-active" : "";
    return `<button class="summon-item${active}" type="button" data-index="${index}" data-kind="${kind}" data-id="${escapeHtml(item.id)}">
      <span class="summon-item-kind">${kind === "path" ? "路径" : "项目"}</span>
      <span class="summon-item-main">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.path)}</small>
      </span>
    </button>`;
  }).join("");
}

function refreshHits() {
  currentHits = buildHits(input()?.value || "");
  if (activeIndex >= currentHits.length) activeIndex = Math.max(0, currentHits.length - 1);
  renderHits();
}

async function activateHit(entry) {
  if (!entry) return;
  closeSummonPalette();
  if (entry.kind === "path") {
    await openLocalPathInFinder(entry.item.path, entry.item.name, { kind: "path", id: entry.item.id });
    revealExistingPath(entry.item, "");
    return;
  }
  await openLocalPathInFinder(entry.item.path, entry.item.name, { kind: "project", id: entry.item.id });
  revealExistingProject(entry.item, "");
}

export function isSummonPaletteOpen() {
  return !overlay()?.hidden;
}

export function openSummonPalette() {
  const root = overlay();
  if (!root) return;
  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  activeIndex = 0;
  const field = input();
  if (field) field.value = "";
  refreshHits();
  setTimeout(() => field?.focus(), 0);
}

export function closeSummonPalette() {
  const root = overlay();
  if (!root || root.hidden) return;
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  currentHits = [];
  activeIndex = 0;
}

export function bindSummonPalette() {
  const root = overlay();
  const field = input();
  const results = list();
  if (!root || !field || !results) return;

  field.addEventListener("input", () => {
    activeIndex = 0;
    refreshHits();
  });
  results.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    const index = Number(button.dataset.index);
    await activateHit(currentHits[index]);
  });
  root.addEventListener("click", (event) => {
    if (event.target === root) closeSummonPalette();
  });
  document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && isSummonPaletteOpen()) {
      event.preventDefault();
      closeSummonPalette();
      return;
    }
    if (!isSummonPaletteOpen()) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(currentHits.length - 1, activeIndex + 1);
      renderHits();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      renderHits();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      await activateHit(currentHits[activeIndex]);
    }
  }, true);

  if (typeof window.dashboardDesktop?.onSummon === "function") {
    window.dashboardDesktop.onSummon(() => openSummonPalette());
    const hint = document.querySelector("#summonHotkeyHint");
    if (hint) {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
      hint.textContent = isMac ? "⌘⇧D" : "Ctrl+Shift+D";
      hint.hidden = false;
    }
  }
}
