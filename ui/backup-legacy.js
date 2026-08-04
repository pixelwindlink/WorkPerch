import { STORAGE_KEYS, state } from "./state.js";
import { elements, storageGet, storageSet, storageRemove, showToast } from "./dom.js";
import { engineAction, afterWrite, handleWriteError } from "./engine-client.js";
import { requestConfirm } from "./confirm.js";

export async function exportData() {
  try {
    const { backup } = await engineAction("dashboard.backup.export", {});
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-engine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Engine 备份已导出");
  } catch (error) { await handleWriteError(error, "导出失败"); }
}

export function importSummary(summary) {
  const part = (name, value) => `${name} +${value.added} / ~${value.updated} / =${value.skipped}`;
  return [part("路径", summary.paths), part("速记", summary.notes), part("项目", summary.projects)].join("；");
}

export async function importData(file) {
  try {
    const backup = JSON.parse(await file.text());
    const selected = prompt("输入导入模式：merge（合并）或 replace（替换）", "merge");
    if (selected === null) return;
    const mode = selected.trim().toLowerCase();
    if (!new Set(["merge", "replace"]).has(mode)) throw new Error("导入模式必须是 merge 或 replace。");
    const dryRun = await engineAction("dashboard.backup.import", { backup, mode, dryRun: true });
    if (!(await requestConfirm({
      title: "确认导入",
      message: `dry-run 已通过：${importSummary(dryRun.summary)}。\n\n确认以 ${mode} 模式提交？`,
      confirmLabel: "提交导入",
      danger: mode === "replace",
    }))) return;
    await engineAction("dashboard.backup.import", { backup, mode, dryRun: false, expectedRevision: state.aggregateRevision });
    await afterWrite("备份已原子导入", { probe: true });
  } catch (error) {
    await handleWriteError(error, "导入失败");
  }
}

export function parseLegacyArray(key) {
  try {
    const value = JSON.parse(storageGet(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function legacyData() {
  return { paths: parseLegacyArray(STORAGE_KEYS.paths), notes: parseLegacyArray(STORAGE_KEYS.notes) };
}

export function inspectLegacyData() {
  if (!state.connected) return;
  const legacy = legacyData();
  const count = legacy.paths.length + legacy.notes.length;
  const button = document.querySelector("#legacyButton");
  button.hidden = count === 0;
  if (!count) return;
  const migrated = Boolean(storageGet(STORAGE_KEYS.migration));
  document.querySelector("#legacyMigrationSummary").textContent = `检测到 ${legacy.paths.length} 条旧路径、${legacy.notes.length} 条旧速记。${migrated ? "已记录一次成功迁移；旧数据仍保留。" : "尚未记录成功迁移。"}`;
  document.querySelector("#cleanupLegacyButton").hidden = !migrated;
  document.querySelector("#migrateLegacyButton").textContent = migrated ? "再次校验并合并" : "校验并迁移";
  if (!state.legacyChecked && !migrated) {
    state.legacyChecked = true;
    elements.legacyDialog.showModal();
  }
}

export async function migrateLegacyData() {
  const legacy = legacyData();
  const backup = { format: "dashboard-key-value-list", version: 1, exportedAt: new Date().toISOString(), paths: legacy.paths, notes: legacy.notes };
  try {
    const dryRun = await engineAction("dashboard.backup.import", { backup, mode: "merge", dryRun: true });
    if (!(await requestConfirm({
      title: "确认迁移",
      message: `旧数据 dry-run 已通过：${importSummary(dryRun.summary)}。\n\n确认合并到 Dashboard Engine？旧 localStorage 不会被删除。`,
      confirmLabel: "合并迁移",
    }))) return false;
    const committed = await engineAction("dashboard.backup.import", { backup, mode: "merge", dryRun: false, expectedRevision: state.aggregateRevision });
    storageSet(STORAGE_KEYS.migration, JSON.stringify({ migratedAt: new Date().toISOString(), aggregateRevision: committed.aggregateRevision }));
    await afterWrite("旧数据已迁移；localStorage 原数据仍保留");
    inspectLegacyData();
    return true;
  } catch (error) {
    await handleWriteError(error, "旧数据迁移失败");
    return false;
  }
}

export async function cleanupLegacyData() {
  if (!(await requestConfirm({
    title: "清理旧数据",
    message: "仅删除旧 localStorage 中的 paths 和 notes？主题偏好会保留，此操作不可撤销。",
    confirmLabel: "删除旧数据",
    danger: true,
  }))) return false;
  storageRemove(STORAGE_KEYS.paths);
  storageRemove(STORAGE_KEYS.notes);
  document.querySelector("#legacyButton").hidden = true;
  showToast("旧 paths / notes 已手动清理");
  return true;
}
