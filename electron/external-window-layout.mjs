import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const EXTERNAL_WINDOW_PRESETS = Object.freeze([
  { id: "chrome", label: "Google Chrome", bundleId: "com.google.Chrome" },
  { id: "codex", label: "Codex", bundleId: "com.openai.codex" },
  { id: "kimi", label: "Kimi", bundleId: "com.moonshot.kimicode" },
  { id: "terminal", label: "终端", bundleId: "com.apple.Terminal" },
  { id: "wechat", label: "微信", bundleId: "com.tencent.xinWeChat" },
  { id: "feishu", label: "飞书", bundleId: "com.electron.lark" },
]);

export function externalWindowLayoutsPath(userDataDir) {
  return path.join(userDataDir, "external-window-layouts.json");
}

function parseBounds(stdout) {
  const match = String(stdout).match(/(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  if (![left, top, right, bottom].every((value) => Number.isFinite(value))) return null;
  const width = right - left;
  const height = bottom - top;
  if (width < 200 || height < 120) return null;
  return { x: left, y: top, width, height };
}

async function runOsascript(script) {
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 8000, maxBuffer: 1024 * 64 });
  return stdout;
}

export async function captureFrontWindowBounds(bundleId) {
  if (process.platform !== "darwin") throw new Error("EXTERNAL_WINDOW_UNSUPPORTED_PLATFORM");
  const script = `
    tell application id "${bundleId}"
      if not running then return "NOT_RUNNING"
      if (count of windows) is 0 then return "NO_WINDOW"
      set b to bounds of front window
      return (item 1 of b as string) & "," & (item 2 of b as string) & "," & (item 3 of b as string) & "," & (item 4 of b as string)
    end tell`;
  const stdout = await runOsascript(script);
  const trimmed = stdout.trim();
  if (trimmed === "NOT_RUNNING") throw new Error("EXTERNAL_WINDOW_NOT_RUNNING");
  if (trimmed === "NO_WINDOW") throw new Error("EXTERNAL_WINDOW_NO_WINDOW");
  const bounds = parseBounds(trimmed);
  if (!bounds) throw new Error("EXTERNAL_WINDOW_BOUNDS_INVALID");
  return bounds;
}

export async function applyWindowBounds(bundleId, bounds) {
  if (process.platform !== "darwin") throw new Error("EXTERNAL_WINDOW_UNSUPPORTED_PLATFORM");
  const { x, y, width, height } = bounds;
  const script = `
    tell application id "${bundleId}"
      if not running then return "NOT_RUNNING"
      activate
      if (count of windows) is 0 then return "NO_WINDOW"
      set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
      return "OK"
    end tell`;
  const stdout = await runOsascript(script);
  const trimmed = stdout.trim();
  if (trimmed === "NOT_RUNNING") throw new Error("EXTERNAL_WINDOW_NOT_RUNNING");
  if (trimmed === "NO_WINDOW") throw new Error("EXTERNAL_WINDOW_NO_WINDOW");
  if (trimmed !== "OK") throw new Error("EXTERNAL_WINDOW_APPLY_FAILED");
}

export function createExternalWindowLayoutStore(filePath) {
  let layouts = {};

  function load() {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      layouts = raw?.layouts && typeof raw.layouts === "object" ? raw.layouts : {};
    } catch {
      layouts = {};
    }
  }

  function persist() {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const payload = `${JSON.stringify({ version: 1, layouts }, null, 2)}\n`;
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, payload, "utf8");
    fs.renameSync(tempPath, filePath);
  }

  function save(presetId, bounds) {
    layouts[presetId] = { ...bounds, savedAt: new Date().toISOString() };
    persist();
    return layouts[presetId];
  }

  function get(presetId) {
    return layouts[presetId] || null;
  }

  function list() {
    return EXTERNAL_WINDOW_PRESETS.map((preset) => ({
      ...preset,
      saved: Boolean(layouts[preset.id]),
      savedAt: layouts[preset.id]?.savedAt || null,
      bounds: layouts[preset.id]
        ? { x: layouts[preset.id].x, y: layouts[preset.id].y, width: layouts[preset.id].width, height: layouts[preset.id].height }
        : null,
    }));
  }

  load();
  return { save, get, list };
}
