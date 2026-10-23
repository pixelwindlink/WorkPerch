import { STORAGE_KEYS, state } from "./state.js";
import { storageGet, storageSet, showToast } from "./dom.js";
import { applyMinimalMode } from "./minimal.js";
import { applyTheme, renderAlwaysOnTopButton, setAlwaysOnTopPreference } from "./desktop.js";
import { persistNoteLengthFilter, persistNoteShortMaxChars } from "./note-length-preferences.js";
import { syncNoteLengthFilterButtons, syncNoteShortThresholdIcon } from "./note-length-filter-ui.js";
import { renderAll } from "./render-shared.js";
import {
  PIN_ANIMATION_PRESETS,
  getPinEffectPreferences,
  savePinEffectPreferences,
} from "./pin-effect-preferences.js";
import { syncAlwaysOnTopOpacityPreference } from "./always-on-top-opacity-bridge.js";

const PANELS = [
  { id: "appearance", label: "外观" },
  { id: "pin", label: "置顶与泊车" },
  { id: "notes", label: "速记" },
  { id: "browse", label: "浏览" },
  { id: "desktop", label: "桌面", desktopOnly: true },
];

function dialog() {
  return document.querySelector("#settingsDialog");
}

function activePanelId() {
  return dialog()?.querySelector(".settings-nav-item.is-active")?.dataset.settingsPanel || "appearance";
}

function selectSettingsPanel(panelId) {
  const root = dialog();
  if (!root) return;
  root.querySelectorAll(".settings-nav-item").forEach((button) => {
    const selected = button.dataset.settingsPanel === panelId;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  root.querySelectorAll(".settings-panel").forEach((section) => {
    const selected = section.dataset.settingsPanel === panelId;
    section.classList.toggle("is-active", selected);
    section.hidden = !selected;
  });
}

function syncPinEffectOutputs(root) {
  const longPress = root.querySelector("#settingsPinLongPress");
  const chargeDelay = root.querySelector("#settingsPinChargeDelay");
  const fadeOut = root.querySelector("#settingsPinFadeOut");
  const transparency = root.querySelector("#settingsPinAlwaysOnTopTransparency");
  if (longPress) {
    const out = root.querySelector('[data-settings-output="pinLongPress"]');
    if (out) out.textContent = `${longPress.value} ms`;
  }
  if (chargeDelay) {
    const out = root.querySelector('[data-settings-output="pinChargeDelay"]');
    if (out) out.textContent = `${chargeDelay.value} ms`;
  }
  if (fadeOut) {
    const out = root.querySelector('[data-settings-output="pinFadeOut"]');
    if (out) out.textContent = `${fadeOut.value} ms`;
  }
  if (transparency) {
    const out = root.querySelector('[data-settings-output="pinAlwaysOnTopTransparency"]');
    if (out) out.textContent = `${transparency.value}%`;
  }
}

export function syncSettingsFormFromState() {
  const root = dialog();
  if (!root) return;

  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  root.querySelector("#settingsTheme").value = theme;
  root.querySelector("#settingsMinimalMode").checked = state.minimalMode;

  const pin = getPinEffectPreferences();
  root.querySelector("#settingsPinLongPress").value = String(pin.longPressMs);
  root.querySelector("#settingsPinChargeDelay").value = String(pin.chargePreviewDelayMs);
  root.querySelector("#settingsPinAnimationPreset").value = pin.animationPreset;
  root.querySelector("#settingsPinEffectsEnabled").checked = pin.effectsEnabled;
  root.querySelector("#settingsPinFadeOut").value = String(pin.frameFadeOutMs);
  root.querySelector("#settingsPinAlwaysOnTopTransparency").value = String(
    pin.alwaysOnTopUnfocusedTransparencyPercent,
  );
  syncPinEffectOutputs(root);

  root.querySelector("#settingsNoteShortMax").value = String(state.noteShortMaxChars);
  root.querySelector("#settingsNoteLengthFilter").value = state.noteLengthFilter;
  root.querySelector("#settingsSortMode").value = state.sortMode;

  const desktopSection = root.querySelector('[data-settings-panel="desktop"]');
  const desktopNav = root.querySelector('.settings-nav-item[data-settings-panel="desktop"]');
  const isDesktop = document.documentElement.dataset.desktop === "true";
  if (desktopSection) desktopSection.hidden = !isDesktop || activePanelId() !== "desktop";
  if (desktopNav) desktopNav.hidden = !isDesktop;
  if (isDesktop) {
    const preferred = storageGet(STORAGE_KEYS.alwaysOnTop) === "true";
    root.querySelector("#settingsRestoreAlwaysOnTop").checked = preferred;
  }

  const pinOnly = root.querySelector(".settings-pin-only");
  pinOnly?.querySelectorAll("input, select").forEach((control) => {
    control.disabled = !pin.effectsEnabled;
  });
}

function applySettingsFromForm() {
  const root = dialog();
  if (!root) return;

  applyTheme(root.querySelector("#settingsTheme").value);
  applyMinimalMode(root.querySelector("#settingsMinimalMode").checked, { persist: true });

  const pin = savePinEffectPreferences({
    longPressMs: root.querySelector("#settingsPinLongPress").value,
    chargePreviewDelayMs: root.querySelector("#settingsPinChargeDelay").value,
    animationPreset: root.querySelector("#settingsPinAnimationPreset").value,
    effectsEnabled: root.querySelector("#settingsPinEffectsEnabled").checked,
    frameFadeOutMs: root.querySelector("#settingsPinFadeOut").value,
    alwaysOnTopUnfocusedTransparencyPercent: root.querySelector("#settingsPinAlwaysOnTopTransparency").value,
  });
  renderAlwaysOnTopButton(state.alwaysOnTop);
  syncAlwaysOnTopOpacityPreference();

  persistNoteShortMaxChars(root.querySelector("#settingsNoteShortMax").value);
  persistNoteLengthFilter(root.querySelector("#settingsNoteLengthFilter").value);
  syncNoteShortThresholdIcon();
  syncNoteLengthFilterButtons();

  state.sortMode = root.querySelector("#settingsSortMode").value;
  storageSet(STORAGE_KEYS.sortMode, state.sortMode);
  document.querySelector("#sortMode").value = state.sortMode;
  state.activeViewId = "";

  if (document.documentElement.dataset.desktop === "true") {
    const restore = root.querySelector("#settingsRestoreAlwaysOnTop").checked;
    storageSet(STORAGE_KEYS.alwaysOnTop, restore ? "true" : "false");
    if (!restore && state.alwaysOnTop) {
      void setAlwaysOnTopPreference(false, { persist: true, notify: false });
    }
  }

  renderAll();
  showToast(pin.effectsEnabled ? "设置已保存" : "设置已保存（泊车动画已关闭）");
}

export function openSettingsDialog(panelId = "appearance") {
  const el = dialog();
  if (!el) return;
  selectSettingsPanel(PANELS.some((entry) => entry.id === panelId) ? panelId : "appearance");
  syncSettingsFormFromState();
  el.showModal();
  el.querySelector(".settings-nav-item.is-active")?.focus();
}

export function bindSettingsDialog() {
  const el = dialog();
  if (!el || el.dataset.bound === "true") return;
  el.dataset.bound = "true";

  const presetSelect = el.querySelector("#settingsPinAnimationPreset");
  for (const preset of Object.values(PIN_ANIMATION_PRESETS)) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    presetSelect.append(option);
  }

  el.querySelector(".settings-nav").addEventListener("click", (event) => {
    const button = event.target.closest(".settings-nav-item");
    if (!button) return;
    selectSettingsPanel(button.dataset.settingsPanel);
    syncSettingsFormFromState();
  });

  el.addEventListener("input", (event) => {
    if (event.target.closest(".settings-pin-only")) syncPinEffectOutputs(el);
    if (event.target.id === "settingsPinEffectsEnabled") {
      const enabled = event.target.checked;
      el.querySelector(".settings-pin-only")?.querySelectorAll("input, select").forEach((control) => {
        control.disabled = !enabled;
      });
    }
  });

  el.querySelector("#settingsForm").addEventListener("submit", (event) => {
    if (event.submitter?.value === "save") {
      event.preventDefault();
      applySettingsFromForm();
      el.close();
    }
  });
}
