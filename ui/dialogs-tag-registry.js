import { state } from "./state.js";
import { elements, GROUP_COLORS, escapeHtml, icon, groupById, validGroupColor, showToast, withPreservedElementScroll } from "./dom.js";
import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";
import { requestConfirm } from "./confirm.js";

let registryFilter = "all";

export function groupReferenceBreakdown(groupId) {
  const paths = state.paths.filter((item) => item.tagIds.includes(groupId)).length;
  const notes = state.notes.filter((item) => item.tagIds.includes(groupId)).length;
  const projects = state.projects.filter((item) => item.tagIds.includes(groupId)).length;
  return { paths, notes, projects, total: paths + notes + projects };
}

export function groupReferenceCount(groupId) {
  return groupReferenceBreakdown(groupId).total;
}

export function formatReferenceSummary(breakdown) {
  if (!breakdown.total) return "未使用";
  const parts = [];
  if (breakdown.paths) parts.push(`路径 ${breakdown.paths}`);
  if (breakdown.notes) parts.push(`速记 ${breakdown.notes}`);
  if (breakdown.projects) parts.push(`项目 ${breakdown.projects}`);
  return parts.join(" · ");
}

export function setRegistryFilter(filter) {
  registryFilter = ["all", "unused", "in-use"].includes(filter) ? filter : "all";
  document.querySelectorAll("#groupRegistryFilter [data-tag-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tagFilter === registryFilter);
  });
  renderGroupRegistry();
}

export function setRegistryGroupColor(color) {
  const selected = validGroupColor(color) || GROUP_COLORS[5];
  document.querySelector("#editGroupColor").value = selected;
  document.querySelectorAll("#groupColorPalette [data-group-color]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.groupColor === selected);
  });
}

export function renderRegistryColorPalette(selected) {
  const palette = document.querySelector("#groupColorPalette");
  palette.innerHTML = GROUP_COLORS.map((color) => `<button type="button" data-group-color="${color}" style="--swatch-color:${color}" aria-label="选择颜色 ${color}" title="${color}"></button>`).join("");
  setRegistryGroupColor(selected);
}

export function resetGroupEditor(group = null) {
  document.querySelector("#editGroupId").value = group?.id || "";
  document.querySelector("#editGroupName").value = group?.name || "";
  document.querySelector("#groupRegistryEditorTitle").textContent = group ? "编辑 TAG" : "新增 TAG";
  document.querySelector("#groupRegistrySubmit").textContent = group ? "保存 TAG" : "添加 TAG";
  renderRegistryColorPalette(group?.color || GROUP_COLORS[5]);
}

export function renderGroupRegistry() {
  withPreservedElementScroll(elements.groupRegistryList, () => {
    const groups = [...state.tags]
      .map((group) => ({ group, breakdown: groupReferenceBreakdown(group.id) }))
      .filter(({ breakdown }) => {
        if (registryFilter === "unused") return breakdown.total === 0;
        if (registryFilter === "in-use") return breakdown.total > 0;
        return true;
      })
      .sort((a, b) => b.breakdown.total - a.breakdown.total || a.group.name.localeCompare(b.group.name, "zh-CN"));

    elements.groupRegistryList.innerHTML = groups.map(({ group, breakdown }) => {
      const summary = formatReferenceSummary(breakdown);
      return `
      <div class="group-registry-row" data-group-id="${escapeHtml(group.id)}">
        <span class="group-registry-swatch" style="--tag-color:${escapeHtml(group.color)}"></span>
        <div class="group-registry-name"><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(summary)}</small></div>
        <code>${escapeHtml(group.color)}</code>
        <div class="row-actions">
          <button class="row-button" data-group-action="edit" data-label="编辑" type="button" aria-label="编辑 ${escapeHtml(group.name)}">${icon("edit")}</button>
          <button class="row-button danger" data-group-action="delete" data-label="${breakdown.total ? "使用中" : "删除"}" type="button" aria-label="${breakdown.total ? `TAG ${escapeHtml(group.name)} 使用中，无法删除` : `删除 ${escapeHtml(group.name)}`}" ${breakdown.total ? 'aria-disabled="true"' : ""}>${icon("trash")}</button>
        </div>
      </div>`;
    }).join("");
    document.querySelector("#groupRegistryEmpty").hidden = groups.length > 0;
    document.querySelector("#groupRegistryEmpty").textContent = state.tags.length
      ? "当前筛选下没有 TAG。"
      : "还没有 TAG Item。";
    document.querySelector("#groupRegistryCount").textContent = String(state.tags.length);
  });
}

export function openGroupRegistry(groupId = "") {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  setRegistryFilter("all");
  resetGroupEditor(groupById(groupId) || null);
  elements.groupRegistryDialog.showModal();
  setTimeout(() => document.querySelector("#editGroupName").focus(), 0);
}

export async function saveGroupEdit() {
  const id = document.querySelector("#editGroupId").value;
  const item = {
    ...(id ? { id } : {}),
    name: document.querySelector("#editGroupName").value.trim(),
    color: document.querySelector("#editGroupColor").value.toUpperCase(),
  };
  try {
    const result = await engineAction("dashboard.tag.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(id ? "TAG 已统一更新" : "TAG 已添加", { result, patch: { type: "upsert", collection: "tags" } });
    resetGroupEditor();
    return true;
  } catch (error) {
    await handleWriteError(error, "保存 TAG 失败");
    return false;
  }
}

export async function handleGroupRegistryAction(event) {
  const action = event.target.closest("[data-group-action]");
  const group = groupById(action?.closest("[data-group-id]")?.dataset.groupId);
  if (!action || !group) return;
  if (action.dataset.groupAction === "edit") {
    resetGroupEditor(group);
    document.querySelector("#editGroupName").focus();
    return;
  }
  if (action.dataset.groupAction !== "delete") return;
  if (action.disabled || action.getAttribute("aria-disabled") === "true") {
    const breakdown = groupReferenceBreakdown(group.id);
    showToast(breakdown.total ? `TAG“${group.name}”仍有引用（${formatReferenceSummary(breakdown)}），无法删除` : `TAG“${group.name}”当前不可删除`);
    return;
  }

  const confirmed = await requestConfirm({
    title: "删除 TAG",
    message: `删除未使用的 TAG“${group.name}”？`,
    confirmLabel: "删除",
    danger: true,
  });
  if (!confirmed) return;

  try {
    const result = await engineAction("dashboard.tag.delete", { id: group.id, expectedRevision: state.aggregateRevision });
    await afterWrite("TAG 已删除", { result, patch: { type: "delete", collection: "tags" } });
    if (document.querySelector("#editGroupId").value === group.id) resetGroupEditor();
    renderGroupRegistry();
  } catch (error) {
    await handleWriteError(error, "删除 TAG 失败");
    renderGroupRegistry();
  }
}
