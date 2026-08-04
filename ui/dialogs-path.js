import { state } from "./state.js";
import { elements, tagNames, parseTagNames, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError, loadSnapshot } from "./engine-client.js";
import { normalizeDroppedPath, findExistingPath, revealExistingPath } from "./render-paths.js";
import { setButtonKeyboardLabel } from "./keyboard.js";

export function pathInput(item, changes = {}) {
  return { id: item.id, name: item.name, path: item.path, tagIds: item.tagIds, description: item.description, pinned: item.pinned, ...changes };
}

export function openPathEditor(item = null, options = {}) {
  if (!state.connected) return showToast("请先连接 Dashboard Engine Server");
  const editing = Boolean(item?.id);
  state.pathDialogFromDrop = Boolean(options.fromDrop);
  document.querySelector("#pathDialogKicker").textContent = editing ? "EDIT PAIR" : "ADD PAIR";
  document.querySelector("#pathDialogTitle").textContent = editing ? "编辑文件路径" : "添加文件路径";
  setButtonKeyboardLabel("#pathDialogSubmit", editing ? "保存修改" : "添加路径", "Enter");
  const notice = document.querySelector("#pathDialogNotice");
  notice.textContent = options.notice || "";
  notice.hidden = !options.notice;
  document.querySelector("#editPathId").value = item?.id || "";
  document.querySelector("#editPathKey").value = item?.name || "";
  document.querySelector("#editPathValue").value = item?.path || "";
  document.querySelector("#editPathGroup").value = tagNames(item).join(", ");
  document.querySelector("#editPathNote").value = item?.description || "";
  elements.editPathDialog.showModal();
  setTimeout(() => document.querySelector(options.fromDrop && !item?.path ? "#editPathValue" : "#editPathKey").focus(), 0);
}

export async function savePathEdit() {
  const id = document.querySelector("#editPathId").value;
  const existing = state.paths.find((item) => item.id === id);
  const item = {
    ...(id ? { id } : {}),
    name: document.querySelector("#editPathKey").value.trim(),
    path: normalizeDroppedPath(document.querySelector("#editPathValue").value) || document.querySelector("#editPathValue").value.trim(),
    tags: parseTagNames(document.querySelector("#editPathGroup").value),
    description: document.querySelector("#editPathNote").value.trim(),
    pinned: existing?.pinned || false,
  };
  try {
    const result = await engineAction("dashboard.path.upsert", { expectedRevision: state.aggregateRevision, item });
    await afterWrite(existing ? "路径已更新" : "路径已添加", { result, patch: { type: "upsert", collection: "paths" } });
    return true;
  } catch (error) {
    if (error.code === "DASHBOARD_PATH_ALREADY_EXISTS") {
      await loadSnapshot({ silent: true, probe: false });
      const duplicate = findExistingPath(item.path);
      if (duplicate) {
        elements.editPathDialog.close();
        revealExistingPath(duplicate, `已经收录：${duplicate.name}`);
        return false;
      }
    }
    await handleWriteError(error, "保存路径失败");
    return false;
  }
}
