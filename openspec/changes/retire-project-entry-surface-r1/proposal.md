# Change: 下线项目入口操作面（R1）

## Why

导航已收敛为「文件路径 / 速记 / 剪贴板」；项目 Tab 与 Launcher 启动面不再作为日常入口。

## What

- `ui/surface-flags.js`：`PROJECT_ENTRY_SURFACE_RETIRED = true`。
- UI 移除：升为项目、路径行项目提示、最近项目、拖入批量的项目目标、Summon 项目项、Launcher Tab 事件绑定。
- **保留** `perch.project.*` Action 与存量数据，供备份/导入与后续迁移；不在本 Change 删除 Engine 合同。

## Evidence

- `ui/render-paths.js`、`ui/drop-batch.js`、`ui/summon.js`、`ui/events.js`
- E2E：`tests/e2e/http-ui.test.mjs` 断言静态 HTML 不含「升为项目」
