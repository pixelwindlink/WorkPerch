import { state } from "./state.js";
import { elements } from "./dom.js";
import { loadSnapshot, switchTab } from "./engine-client.js";
import { renderAll, activateSavedView, saveCurrentView, deleteCurrentView } from "./render-shared.js";
import { renderPaths, handlePathAction, refreshAllPathStatuses, setAbnormalPathFilter, batchDeleteAbnormalPaths } from "./render-paths.js";
import { bindSilentPathRefresh } from "./silent-refresh.js";
import { bindSummonPalette } from "./summon.js";
import { renderProjects, handleProjectAction } from "./render-projects.js";
import { renderNotes, handleNoteAction } from "./render-notes.js";
import { openPathEditor, savePathEdit } from "./dialogs-path.js";
import { openNoteEditor, saveNoteEdit } from "./dialogs-note.js";
import { openProjectEditor, saveProjectEdit, saveProjectLaunchConfiguration } from "./dialogs-project.js";
import { openGroupRegistry, resetGroupEditor, setRegistryGroupColor, handleGroupRegistryAction, saveGroupEdit, setRegistryFilter } from "./dialogs-tag-registry.js";
import { saveDropBatch, processNextDroppedCandidate, handleDrop, revealExistingEntry } from "./drop-batch.js";
import { exportData, importData, inspectLegacyData, migrateLegacyData, cleanupLegacyData } from "./backup-legacy.js";
import { applyTheme, setAlwaysOnTopPreference } from "./desktop.js";
import { bindConfirmDialog } from "./confirm.js";
import { toggleMinimalMode } from "./minimal.js";
import { bindGuide } from "./guide.js";

export function focusActiveSearch() {
  const selector = state.activeTab === "paths" ? "#pathSearch" : state.activeTab === "launcher" ? "#projectSearch" : "#noteSearch";
  document.querySelector(selector).focus();
}

export function bindDialogSubmit(formSelector, dialog, save) {
  document.querySelector(formSelector).addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "save") return;
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    event.submitter.disabled = true;
    try { if (await save()) dialog.close(); } finally { event.submitter.disabled = false; }
  });
}

export function bindEvents() {
  bindConfirmDialog();
  bindGuide();
  elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  window.addEventListener("hashchange", () => switchTab(location.hash.slice(1), false));
  document.querySelector("#retryConnectionButton").addEventListener("click", () => loadSnapshot());

  document.querySelector("#addPathButton").addEventListener("click", () => openPathEditor());
  document.querySelector("#refreshAllPathsButton").addEventListener("click", () => refreshAllPathStatuses());
  document.querySelector("#abnormalPathsButton").addEventListener("click", () => {
    setAbnormalPathFilter(state.pathStatus !== "abnormal");
  });
  document.querySelector("#cleanupAbnormalPathsButton").addEventListener("click", () => batchDeleteAbnormalPaths());
  document.querySelector("#pathSearch").addEventListener("input", (event) => { state.pathSearch = event.target.value; renderPaths(); });
  document.querySelector("#pathCategory").addEventListener("change", (event) => { state.pathCategory = event.target.value; renderPaths({ resetScroll: true }); });
  document.querySelector("#pathStatusFilter").addEventListener("change", (event) => { state.pathStatus = event.target.value; renderPaths({ resetScroll: true }); });
  document.querySelector("#clearPathFilter").addEventListener("click", () => {
    state.pathSearch = "";
    state.pathCategory = "all";
    state.pathStatus = "any";
    document.querySelector("#pathSearch").value = "";
    document.querySelector("#pathCategory").value = "all";
    document.querySelector("#pathStatusFilter").value = "any";
    renderPaths({ resetScroll: true });
  });
  elements.pathList.addEventListener("click", handlePathAction);
  document.querySelector("#usageHome").addEventListener("click", handlePathAction);
  bindDialogSubmit("#editPathForm", elements.editPathDialog, savePathEdit);
  document.querySelector("#dropBatchForm").addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "batch-save") return;
    event.preventDefault();
    event.submitter.disabled = true;
    try { if (await saveDropBatch()) elements.dropBatchDialog.close(); } finally { event.submitter.disabled = false; }
  });
  document.querySelector("#dropBatchList").addEventListener("click", (event) => {
    const button = event.target.closest(".batch-reveal");
    if (!button) return;
    revealExistingEntry(button.dataset.existingKind, button.dataset.existingId);
  });
  elements.editPathDialog.addEventListener("close", () => {
    const continueDrop = state.pathDialogFromDrop;
    state.pathDialogFromDrop = false;
    document.querySelector("#pathDialogNotice").hidden = true;
    if (continueDrop && state.dropQueue.length) setTimeout(processNextDroppedCandidate, 80);
  });
  document.querySelector("#manageGroupsButton").addEventListener("click", () => openGroupRegistry());
  document.querySelector("#groupRegistryReset").addEventListener("click", () => resetGroupEditor());
  document.querySelector("#editGroupColor").addEventListener("input", (event) => setRegistryGroupColor(event.target.value));
  document.querySelector("#groupColorPalette").addEventListener("click", (event) => {
    const button = event.target.closest("[data-group-color]");
    if (button) setRegistryGroupColor(button.dataset.groupColor);
  });
  elements.groupRegistryList.addEventListener("click", handleGroupRegistryAction);
  document.querySelector("#groupRegistryFilter").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag-filter]");
    if (button) setRegistryFilter(button.dataset.tagFilter);
  });
  document.querySelector("#groupRegistryForm").addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "group-save") return;
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    event.submitter.disabled = true;
    try { await saveGroupEdit(); } finally { event.submitter.disabled = false; }
  });

  document.querySelector("#addProjectButton").addEventListener("click", () => openProjectEditor());
  document.querySelector("#projectSearch").addEventListener("input", (event) => { state.projectSearch = event.target.value; renderProjects(); });
  document.querySelector("#projectFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.projectFilter = button.dataset.filter;
    document.querySelectorAll("#projectFilters button").forEach((item) => item.classList.toggle("is-active", item === button));
    renderProjects();
  });
  elements.projectList.addEventListener("click", handleProjectAction);
  bindDialogSubmit("#editProjectForm", elements.editProjectDialog, saveProjectEdit);
  bindDialogSubmit("#launchProjectForm", elements.launchProjectDialog, saveProjectLaunchConfiguration);

  document.querySelector("#addNoteButton").addEventListener("click", () => openNoteEditor());
  document.querySelector("#noteSearch").addEventListener("input", (event) => { state.noteSearch = event.target.value; renderNotes(); });
  document.querySelector("#clearNoteFilter").addEventListener("click", () => {
    state.noteSearch = "";
    document.querySelector("#noteSearch").value = "";
    renderNotes();
  });
  elements.noteList.addEventListener("click", handleNoteAction);
  bindDialogSubmit("#editNoteForm", elements.editNoteDialog, saveNoteEdit);

  document.querySelector("#sortMode").addEventListener("change", (event) => { state.sortMode = event.target.value; state.activeViewId = ""; renderAll(); });
  document.querySelector("#savedViewSelect").addEventListener("change", (event) => activateSavedView(event.target.value));
  document.querySelector("#saveViewButton").addEventListener("click", saveCurrentView);
  document.querySelector("#deleteViewButton").addEventListener("click", deleteCurrentView);

  document.querySelector("#exportButton").addEventListener("click", exportData);
  document.querySelector("#importInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importData(file);
    event.target.value = "";
  });
  document.querySelector("#legacyButton").addEventListener("click", () => { inspectLegacyData(); elements.legacyDialog.showModal(); });
  document.querySelector("#legacyMigrationForm").addEventListener("submit", async (event) => {
    if (event.submitter?.value === "migrate") {
      event.preventDefault();
      event.submitter.disabled = true;
      try { if (await migrateLegacyData()) elements.legacyDialog.close(); } finally { event.submitter.disabled = false; }
    }
    if (event.submitter?.value === "cleanup") {
      event.preventDefault();
      if (await cleanupLegacyData()) elements.legacyDialog.close();
    }
  });
  document.querySelector("#themeButton").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
  document.querySelector("#minimalModeButton").addEventListener("click", () => toggleMinimalMode());
  elements.alwaysOnTopButton.addEventListener("click", async () => {
    elements.alwaysOnTopButton.disabled = true;
    try { await setAlwaysOnTopPreference(!state.alwaysOnTop); } finally { elements.alwaysOnTopButton.disabled = false; }
  });

  let dragDepth = 0;
  const hasDropData = (event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain");
  };
  const clearDragState = () => { dragDepth = 0; document.body.classList.remove("is-dragging"); };
  document.addEventListener("dragenter", (event) => {
    if (!hasDropData(event)) return;
    event.preventDefault();
    dragDepth += 1;
    document.body.classList.add("is-dragging");
  });
  document.addEventListener("dragover", (event) => {
    if (!hasDropData(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  document.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove("is-dragging");
  });
  document.addEventListener("drop", (event) => {
    if (!hasDropData(event)) return;
    dragDepth = 0;
    handleDrop(event);
  });
  window.addEventListener("dragend", clearDragState);
  window.addEventListener("blur", clearDragState);

  document.addEventListener("keydown", (event) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if ((event.key === "/" && !typing) || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      focusActiveSearch();
    }
  });

  bindSilentPathRefresh();
  bindSummonPalette();
}
