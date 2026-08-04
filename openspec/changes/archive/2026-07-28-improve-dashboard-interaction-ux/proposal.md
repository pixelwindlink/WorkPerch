## Why

Dashboard 的危险操作仍大量依赖浏览器原生 `confirm()`。在已打开的 `<dialog>`（导入 dry-run、legacy 迁移、TAG Registry）里，Chromium/Electron 会吞掉或干扰该确认框，用户体感是“点了没反应”。同时 TAG Registry 对“使用中”标签缺少可操作的清理路径与筛选，窄屏下关键控件仍易被藏掉。前端已模块化，现在适合把交互债一次性收干净。

## What Changes

- 新增应用内确认对话框，替换 UI 内所有业务相关的原生 `confirm()`（删除、导入提交、legacy 迁移/清理、TAG 删除等）。
- 强化 TAG Registry 交互：支持按“全部 / 未使用 / 使用中”筛选；行内展示引用摘要；对使用中 TAG 给出明确阻塞原因，不绕过 `DASHBOARD_TAG_IN_USE` 领域规则。
- 收紧窄屏信息架构：在 Desktop 最小可用宽度附近保留关键筛选/导入导出入口的可达性，避免误藏导致“功能消失”。
- 不修改 Action Catalog、aggregate Schema 或 EngineMessage 协议；不引入打包器。

## Capabilities

### New Capabilities

- `dashboard-interaction-ux`: 定义应用内确认流、TAG Registry 可发现的生命周期交互，以及窄屏下关键控件可达性要求。

### Modified Capabilities

无。

## Impact

- Web UI：`index.html` 增加确认 dialog；新增 `ui/confirm.js`；更新 `events` / `dialogs-*` / `backup-legacy` / `render-*` 调用点；`styles.css` 补充确认框与 Registry 筛选样式。
- 测试：e2e/字符串契约改为断言应用内确认与 TAG 筛选/引用提示；覆盖“dialog 打开时确认仍可用”。
- Desktop：行为与浏览器一致；打包仍携带静态 `ui/` 模块。
- 文档：`AGENT.md` / `README.md` 简述确认与 TAG 筛选交互。
