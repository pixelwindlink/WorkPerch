#!/usr/bin/env node
/**
 * One-shot helper: split /tmp/dashboard-app-monolith.js into ui/* modules + thin app.js.
 * Safe to re-run; overwrites ui/*.js and app.js.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monolithPath = "/tmp/dashboard-app-monolith.js";
const source = await fs.readFile(monolithPath, "utf8");

function scanBalanced(startIdx, openCh, closeCh) {
  let i = startIdx;
  let depth = 0;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inStr === '"' || inStr === "'") {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (inStr === "`") {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === "`") {
        inStr = null;
        continue;
      }
      if (ch === "$" && next === "{") {
        const exprEnd = scanBalanced(i + 1, "{", "}");
        i = exprEnd;
        continue;
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === "/") {
      // Regex literal — only when it can appear (after expression start tokens).
      const prev = source.slice(0, i).match(/(\S)\s*$/);
      const prevCh = prev?.[1] || "";
      if (!prevCh || /[([=,!:?&|%;<>~^+\-*%]/.test(prevCh) || prevCh === "return" || /\b(?:return|case|throw|new|typeof|delete|void|in|of|instanceof)$/.test(source.slice(Math.max(0, i - 12), i).trim())) {
        i += 1;
        let inClass = false;
        for (; i < source.length; i += 1) {
          const rch = source[i];
          if (rch === "\\" ) {
            i += 1;
            continue;
          }
          if (rch === "[" ) inClass = true;
          else if (rch === "]" ) inClass = false;
          else if (rch === "/" && !inClass) break;
          else if (rch === "\n") break;
        }
        continue;
      }
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === openCh) depth += 1;
    else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`unbalanced ${openCh}${closeCh} from ${startIdx}`);
}

function extractFunction(name) {
  const re = new RegExp(`(?:async )?function ${name}\\s*\\(`);
  const match = re.exec(source);
  if (!match) throw new Error(`function not found: ${name}`);
  const start = match.index;
  const paramsOpen = source.indexOf("(", start);
  const paramsClose = scanBalanced(paramsOpen, "(", ")");
  let i = paramsClose + 1;
  while (/\s/.test(source[i] || "")) i += 1;
  if (source[i] !== "{") throw new Error(`no body for ${name} at ${i}`);
  const bodyClose = scanBalanced(i, "{", "}");
  return source.slice(start, bodyClose + 1);
}

function extractClass(name) {
  const re = new RegExp(`class ${name}\\b`);
  const match = re.exec(source);
  if (!match) throw new Error(`class not found: ${name}`);
  const start = match.index;
  const bodyOpen = source.indexOf("{", start);
  const bodyClose = scanBalanced(bodyOpen, "{", "}");
  return source.slice(start, bodyClose + 1);
}

function extractConstBlock(name) {
  const re = new RegExp(`const ${name}\\s*=`);
  const match = re.exec(source);
  if (!match) throw new Error(`const not found: ${name}`);
  const start = match.index;
  const eq = source.indexOf("=", start);
  let i = eq + 1;
  while (/\s/.test(source[i] || "")) i += 1;
  if (source[i] === "{") {
    const end = scanBalanced(i, "{", "}");
    return source.slice(start, end + 1) + (source[end + 1] === ";" ? ";" : "");
  }
  if (source[i] === "[") {
    const end = scanBalanced(i, "[", "]");
    return source.slice(start, end + 1) + (source[end + 1] === ";" ? ";" : "");
  }
  const end = source.indexOf(";", start);
  return source.slice(start, end + 1);
}

function exportify(block) {
  if (block.startsWith("export ")) return block;
  if (block.startsWith("async function ")) return `export ${block}`;
  if (block.startsWith("function ")) return `export ${block}`;
  if (block.startsWith("class ")) return `export ${block}`;
  if (block.startsWith("const ")) return `export ${block}`;
  return `export ${block}`;
}

const modules = {
  "ui/state.js": {
    imports: [],
    consts: ["STORAGE_KEYS", "state"],
    functions: [],
  },
  "ui/dom.js": {
    imports: [
      'import { state } from "./state.js";',
    ],
    consts: ["ICONS", "GROUP_COLORS", "elements"],
    functions: [
      "storageGet", "storageSet", "storageRemove", "icon", "escapeHtml", "normalize",
      "validGroupColor", "derivedGroupColor", "groupById", "groupByName", "tagsFor",
      "tagNames", "renderTagChips", "parseTagNames", "messageId", "safeHttpUrl",
      "finderFailureMessage", "showToast", "formatDate",
    ],
  },
  "ui/engine-client.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, messageId, showToast } from "./dom.js";',
      'import { renderAll } from "./render-shared.js";',
      'import { inspectLegacyData } from "./backup-legacy.js";',
      'import { refreshProjectStatuses, refreshLauncherStatuses } from "./render-projects.js";',
    ],
    classes: ["EngineClientError"],
    functions: [
      "switchTab", "setConnectionStatus", "engineAction", "loadSnapshot",
      "afterWrite", "handleWriteError", "recordUsage", "copyText",
    ],
  },
  "ui/desktop.js": {
    imports: [
      'import { STORAGE_KEYS, state } from "./state.js";',
      'import { elements, storageGet, storageSet, icon, showToast, finderFailureMessage } from "./dom.js";',
      'import { recordUsage } from "./engine-client.js";',
    ],
    functions: [
      "openLocalPathInFinder", "applyTheme", "renderAlwaysOnTopButton",
      "setAlwaysOnTopPreference", "initializeDesktopWindowControls",
    ],
  },
  "ui/render-shared.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { escapeHtml, normalize, tagNames, showToast } from "./dom.js";',
      'import { engineAction, loadSnapshot, afterWrite, handleWriteError, switchTab } from "./engine-client.js";',
      'import { renderPathGroups, renderPaths } from "./render-paths.js";',
      'import { renderProjects } from "./render-projects.js";',
      'import { renderNotes } from "./render-notes.js";',
      'import { renderGroupRegistry } from "./dialogs-tag-registry.js";',
      'import { elements } from "./dom.js";',
    ],
    functions: [
      "compareRecords", "inspectionLabel", "renderAll", "renderSavedViews",
      "activateSavedView", "saveCurrentView", "deleteCurrentView",
    ],
  },
  "ui/render-paths.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError, loadSnapshot, copyText } from "./engine-client.js";',
      'import { compareRecords, inspectionLabel } from "./render-shared.js";',
      'import { openLocalPathInFinder } from "./desktop.js";',
      'import { openPathEditor, pathInput } from "./dialogs-path.js";',
      'import { switchTab } from "./engine-client.js";',
    ],
    functions: [
      "renderPathGroups", "renderPaths", "handlePathAction",
      "comparablePath", "normalizeDroppedPath", "pathName", "findExistingPath", "revealExistingPath",
    ],
  },
  "ui/render-projects.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, safeHttpUrl, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError, copyText, recordUsage } from "./engine-client.js";',
      'import { compareRecords, inspectionLabel } from "./render-shared.js";',
      'import { openLocalPathInFinder } from "./desktop.js";',
      'import { openProjectEditor, openProjectLaunchEditor, projectInput } from "./dialogs-project.js";',
    ],
    functions: [
      "launcherStatus", "renderProjects", "handleProjectAction",
      "refreshProjectStatuses", "refreshLauncherStatuses", "handleLauncherError",
    ],
  },
  "ui/render-notes.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, escapeHtml, normalize, tagNames, renderTagChips, icon, formatDate } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError, copyText } from "./engine-client.js";',
      'import { compareRecords } from "./render-shared.js";',
      'import { openNoteEditor, noteInput } from "./dialogs-note.js";',
    ],
    functions: ["renderNotes", "handleNoteAction"],
  },
  "ui/dialogs-path.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, tagNames, parseTagNames, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError, loadSnapshot } from "./engine-client.js";',
      'import { normalizeDroppedPath, findExistingPath, revealExistingPath } from "./render-paths.js";',
    ],
    functions: ["pathInput", "openPathEditor", "savePathEdit"],
  },
  "ui/dialogs-note.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, tagNames, parseTagNames, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";',
    ],
    functions: ["noteInput", "openNoteEditor", "saveNoteEdit"],
  },
  "ui/dialogs-project.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, tagNames, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";',
      'import { handleLauncherError, renderProjects } from "./render-projects.js";',
    ],
    functions: [
      "projectInput", "openProjectEditor", "saveProjectEdit",
      "conservativeCommandSuggestion", "openProjectLaunchEditor", "saveProjectLaunchConfiguration",
    ],
  },
  "ui/dialogs-tag-registry.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, GROUP_COLORS, escapeHtml, icon, groupById, validGroupColor, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";',
    ],
    functions: [
      "setRegistryGroupColor", "renderRegistryColorPalette", "groupReferenceCount",
      "resetGroupEditor", "renderGroupRegistry", "openGroupRegistry", "saveGroupEdit",
      "handleGroupRegistryAction",
    ],
  },
  "ui/drop-batch.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, escapeHtml, parseTagNames, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError, switchTab } from "./engine-client.js";',
      'import { comparablePath, normalizeDroppedPath, pathName, findExistingPath, revealExistingPath } from "./render-paths.js";',
      'import { inspectionLabel } from "./render-shared.js";',
      'import { openPathEditor } from "./dialogs-path.js";',
    ],
    functions: [
      "desktopDroppedPath", "extractDroppedCandidates", "processNextDroppedCandidate",
      "renderDropBatchPlan", "openDropBatch", "saveDropBatch", "handleDrop",
    ],
  },
  "ui/backup-legacy.js": {
    imports: [
      'import { STORAGE_KEYS, state } from "./state.js";',
      'import { elements, storageGet, storageSet, storageRemove, showToast } from "./dom.js";',
      'import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";',
    ],
    functions: [
      "exportData", "importSummary", "importData", "parseLegacyArray", "legacyData",
      "inspectLegacyData", "migrateLegacyData", "cleanupLegacyData",
    ],
  },
  "ui/header-layout.js": {
    imports: [],
    functions: ["syncHeaderHeight", "bindHeaderLayout"],
  },
  "ui/events.js": {
    imports: [
      'import { state } from "./state.js";',
      'import { elements, setRegistryGroupColor } from "./dom.js";',
      // setRegistryGroupColor is in dialogs-tag-registry - fix below
    ],
    functions: ["focusActiveSearch", "bindDialogSubmit", "bindEvents"],
  },
};

// Fix events imports properly after defining modules object
modules["ui/events.js"].imports = [
  'import { state } from "./state.js";',
  'import { elements } from "./dom.js";',
  'import { loadSnapshot, switchTab } from "./engine-client.js";',
  'import { renderAll, activateSavedView, saveCurrentView, deleteCurrentView } from "./render-shared.js";',
  'import { renderPaths, handlePathAction } from "./render-paths.js";',
  'import { renderProjects, handleProjectAction } from "./render-projects.js";',
  'import { renderNotes, handleNoteAction } from "./render-notes.js";',
  'import { openPathEditor, savePathEdit } from "./dialogs-path.js";',
  'import { openNoteEditor, saveNoteEdit } from "./dialogs-note.js";',
  'import { openProjectEditor, saveProjectEdit, saveProjectLaunchConfiguration } from "./dialogs-project.js";',
  'import { openGroupRegistry, resetGroupEditor, setRegistryGroupColor, handleGroupRegistryAction, saveGroupEdit } from "./dialogs-tag-registry.js";',
  'import { saveDropBatch, processNextDroppedCandidate, handleDrop } from "./drop-batch.js";',
  'import { exportData, importData, inspectLegacyData, migrateLegacyData, cleanupLegacyData } from "./backup-legacy.js";',
  'import { applyTheme, setAlwaysOnTopPreference } from "./desktop.js";',
];

// Move setRegistryGroupColor etc. - already in dialogs-tag-registry
// Remove from dom.js the ones that moved - already not in dom list for setRegistry*

async function writeModule(rel, spec) {
  const parts = [];
  if (spec.imports?.length) parts.push(spec.imports.join("\n"), "");
  for (const name of spec.consts || []) parts.push(exportify(extractConstBlock(name)), "");
  for (const name of spec.classes || []) parts.push(exportify(extractClass(name)), "");
  for (const name of spec.functions || []) parts.push(exportify(extractFunction(name)), "");
  const out = `${parts.join("\n").trim()}\n`;
  const full = path.join(root, rel);
  await fs.writeFile(full, out, "utf8");
  process.stdout.write(`wrote ${rel}\n`);
}

for (const [rel, spec] of Object.entries(modules)) {
  await writeModule(rel, spec);
}

const appJs = `import { STORAGE_KEYS } from "./ui/state.js";
import { storageGet } from "./ui/dom.js";
import { setConnectionStatus, loadSnapshot, switchTab } from "./ui/engine-client.js";
import { renderAll } from "./ui/render-shared.js";
import { applyTheme, initializeDesktopWindowControls } from "./ui/desktop.js";
import { bindHeaderLayout } from "./ui/header-layout.js";
import { bindEvents } from "./ui/events.js";

if (window.dashboardDesktop?.getPathForFile) document.documentElement.dataset.desktop = "true";
applyTheme(storageGet(STORAGE_KEYS.theme) || "dark");
setConnectionStatus("connecting", "正在连接 Dashboard Engine…", "业务数据由 Engine Server 单一持有。");
renderAll();
bindEvents();
bindHeaderLayout();
switchTab(location.hash.slice(1) || "paths", false);
initializeDesktopWindowControls();
loadSnapshot();
`;

await fs.writeFile(path.join(root, "app.js"), appJs, "utf8");
process.stdout.write("wrote app.js\n");
