import { escapeHtml, showToast } from "./dom.js";

function desktopWindows() {
  return window.perchDesktop?.externalWindows || null;
}

export async function openWindowPresetsDialog() {
  const api = desktopWindows();
  const dialog = document.querySelector("#windowPresetsDialog");
  const list = document.querySelector("#windowPresetsList");
  if (!dialog || !list) return;
  if (!api?.list) {
    showToast("窗口预设仅在 WorkPerch Desktop（macOS）可用", 3600);
    return;
  }
  const presets = await api.list();
  list.innerHTML = presets.map((preset) => `
    <div class="window-preset-row" data-id="${escapeHtml(preset.id)}">
      <div>
        <strong>${escapeHtml(preset.label)}</strong>
        <small>${preset.saved ? `已保存 · ${escapeHtml(preset.savedAt?.replace("T", " ").slice(0, 19) || "")}` : "尚未保存"}</small>
        ${preset.bounds ? `<span class="window-preset-bounds">${preset.bounds.width}×${preset.bounds.height}</span>` : ""}
      </div>
      <div class="row-actions">
        <button class="quiet-button" type="button" data-action="capture-window-preset">保存当前窗口</button>
        <button class="quiet-button" type="button" data-action="apply-window-preset" ${preset.saved ? "" : "disabled"}>恢复</button>
      </div>
    </div>`).join("");
  dialog.showModal();
}

export async function handleWindowPresetAction(event) {
  const row = event.target.closest(".window-preset-row");
  const action = event.target.closest("[data-action]");
  if (!row || !action) return;
  const api = desktopWindows();
  if (!api) return;
  const presetId = row.dataset.id;
  try {
    if (action.dataset.action === "capture-window-preset") {
      await api.capture(presetId);
      showToast("已保存窗口尺寸与位置");
      await openWindowPresetsDialog();
    }
    if (action.dataset.action === "apply-window-preset") {
      await api.apply(presetId);
      showToast("已尝试恢复窗口");
    }
  } catch (error) {
    showToast(error?.message || "操作失败", 3200);
  }
}
