# WorkPerch R3→R2→R4→R1 交付回报（2026-10-22）

## 测试

- `npm test`：**66/66** 通过（含 `clipboard-history` 单测与 HTTP UI e2e）。

## R3 速记长短过滤

- UI + `localStorage` 偏好；`tests/unit/note-length-filter.test.mjs`。
- OpenSpec：`openspec/changes/note-length-filter-ui-r3/proposal.md`。

## R2 剪贴板历史（Desktop）

- 主进程：`electron/clipboard-history.mjs` + IPC + preload `perchDesktop.clipboard`。
- UI：`ui/render-clipboard.js`，Tab「剪贴板」列表与复制。
- 设计说明：`openspec/changes/clipboard-history-r2/proposal.md`（参考 Maccy 模式，无第三方运行时依赖）。

## R4 外窗尺寸预设（Desktop / macOS）

- `electron/external-window-layout.mjs` + 对话框 `windowPresetsDialog`。
- 预设：Chrome、Codex、Kimi、终端、微信、飞书。

## R1 项目入口操作面下线

- `ui/surface-flags.js`：`PROJECT_ENTRY_SURFACE_RETIRED = true`。
- 隐藏升为项目、最近项目、拖入项目目标等；**保留** `perch.project.*` 与备份数据。
- OpenSpec：`openspec/changes/retire-project-entry-surface-r1/proposal.md`。

## 本机看到新 UI

```bash
cd engine_projects/engine-work-perch
npm run desktop:pack
ditto dist/desktop/Perch-darwin-arm64/Perch.app /Applications/Perch.app
open -a Perch
```

## #14 D-11

- 现场 merge 与归档见 `prompts/2026-10-22-14-d11-execution-report.md`（若工作区存在）。
