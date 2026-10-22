# Change: 外窗尺寸预设（R4）

## Why

Owner 在 macOS 上频繁切换 Chrome / Codex / Kimi / 终端等窗口，希望保存与恢复各应用前台窗口 bounds。

## What

- Desktop 通过 AppleScript 读取/设置目标 Bundle ID 的前台窗口 bounds。
- 预设表：`electron/external-window-layout.mjs`；布局持久化 `userData/external-window-layouts.json`。
- Header「外窗尺寸预设」对话框：保存当前 / 恢复。

## Limits

- 仅 macOS；目标应用须已运行且存在窗口。
- 不替代各应用自身的窗口状态；WorkPerch 自身仍用 `window-state.mjs`。
