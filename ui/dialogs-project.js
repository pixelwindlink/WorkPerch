import { state } from "./state.js";
import { elements, tagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, LAUNCHER_UNAVAILABLE_GUIDANCE } from "./engine-client.js";
import { handleLauncherError, renderProjects } from "./render-projects.js";
import { setButtonKeyboardLabel } from "./keyboard.js";

export function projectInput(item, changes = {}) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    label: item.label,
    description: item.description,
    path: item.path,
    url: item.url,
    port: item.port,
    command: item.command,
    tagIds: item.tagIds,
    pinned: item.pinned,
    ...changes,
  };
}

export function openProjectEditor(item = null) {
  if (!state.connected) return showToast("请先连接 WorkPerch Server");
  const editing = Boolean(item?.id);
  document.querySelector("#projectDialogKicker").textContent = editing ? "EDIT ENTRY" : "ADD ENTRY";
  document.querySelector("#projectDialogTitle").textContent = editing ? "编辑项目入口" : "添加项目入口";
  setButtonKeyboardLabel("#projectDialogSubmit", editing ? "保存修改" : "添加项目", "Enter");
  document.querySelector("#editProjectId").value = item?.id || "";
  document.querySelector("#editProjectName").value = item?.name || "";
  document.querySelector("#editProjectType").value = item?.type || "other";
  document.querySelector("#editProjectPath").value = item?.path || "";
  document.querySelector("#editProjectUrl").value = item?.url || "";
  document.querySelector("#editProjectPort").value = String(item?.port || 0);
  document.querySelector("#editProjectCommand").value = item?.command || "";
  document.querySelector("#editProjectLabel").value = item?.label || "Other";
  document.querySelector("#editProjectTags").value = tagNames(item).join(", ");
  document.querySelector("#editProjectDescription").value = item?.description || "";
  elements.editProjectDialog.showModal();
  setTimeout(() => document.querySelector("#editProjectName").focus(), 0);
}

export async function saveProjectEdit() {
  const id = document.querySelector("#editProjectId").value;
  const existing = state.projects.find((item) => item.id === id);
  const tags = document.querySelector("#editProjectTags").value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  const item = {
    ...(id ? { id } : {}),
    name: document.querySelector("#editProjectName").value.trim(),
    type: document.querySelector("#editProjectType").value,
    label: document.querySelector("#editProjectLabel").value.trim(),
    description: document.querySelector("#editProjectDescription").value.trim(),
    path: document.querySelector("#editProjectPath").value.trim(),
    url: document.querySelector("#editProjectUrl").value.trim(),
    port: Number(document.querySelector("#editProjectPort").value || 0),
    command: document.querySelector("#editProjectCommand").value,
    tags: [...new Set(tags)],
    pinned: existing?.pinned || false,
  };
  try {
    const result = await engineAction("perch.project.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "项目入口已更新" : "项目入口已添加", { probe: true, result, patch: { type: "upsert", collection: "projects" } });
    return true;
  } catch (error) {
    await handleWriteError(error, "保存项目失败");
    return false;
  }
}

export function conservativeCommandSuggestion(command) {
  const value = String(command || "").trim();
  if (!value || /[|&;><`$\\'"\n\r]/.test(value)) return null;
  const [executable, ...args] = value.split(/\s+/);
  return executable ? { executable, args } : null;
}

export function openProjectLaunchEditor(item) {
  if (!state.connected) return showToast("请先连接 WorkPerch Server");
  if (state.launcherAvailable === false) return showToast(LAUNCHER_UNAVAILABLE_GUIDANCE, 4200);
  const definition = state.launcherDefinitions.get(item.id);
  const suggestion = definition ? null : conservativeCommandSuggestion(item.command);
  document.querySelector("#launchProjectId").value = item.id;
  document.querySelector("#launchProjectTitle").textContent = `配置安全启动 · ${item.name}`;
  document.querySelector("#launchProjectCwd").value = item.path;
  document.querySelector("#launchProjectExecutable").value = definition?.executable || suggestion?.executable || "";
  document.querySelector("#launchProjectArgs").value = (definition?.args || suggestion?.args || []).join("\n");
  const notice = document.querySelector("#launchProjectNotice");
  notice.textContent = definition
    ? `已登记定义 · Launcher revision ${state.launcherRevision}。保存时将更新同一个 Project ID。`
    : suggestion
      ? "已从旧 COMMAND 生成保守建议；它尚未启用，只有确认保存后才会进入 Launcher allowlist。"
      : "尚未配置。请填写一个非 shell 的 executable，并逐行填写 argv 参数。";
  elements.launchProjectDialog.showModal();
  setTimeout(() => document.querySelector("#launchProjectExecutable").focus(), 0);
}

export async function saveProjectLaunchConfiguration() {
  const projectId = document.querySelector("#launchProjectId").value;
  const executable = document.querySelector("#launchProjectExecutable").value.trim();
  const args = document.querySelector("#launchProjectArgs").value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  try {
    const result = await engineAction("perch.project.launch.configure", {
      projectId,
      expectedLauncherRevision: state.launcherRevision,
      executable,
      args
    });
    state.launcherAvailable = true;
    state.launcherRevision = result.launcherRevision;
    state.launcherDefinitions.set(projectId, result.definition);
    renderProjects();
    showToast("安全启动配置已保存");
    return true;
  } catch (error) {
    await handleLauncherError(error, "保存启动配置失败");
    return false;
  }
}
