## Why

多数写成功后 UI 仍整表拉取 `dashboard.snapshot.get`（有时还带 probe），条目变多时会明显顿一下。同时 Project Launcher `DEPENDENCY_UNAVAILABLE` 只报“未接入”，缺少可操作的恢复指引。交互与前端拆分已完成，适合把运行时反馈收干净。

## What Changes

- 写成功后优先用 Action success payload 做局部状态补丁；仅在缺标签、批量/导入等无法安全补丁时再整表 snapshot。
- 路径/项目检查（inspect）只补丁对应条目的 inspection，不整表重拉。
- Launcher 依赖不可用时给出贴近恢复路径的提示，并在项目入口面板显示持续说明。
- 不改 Action Catalog / Schema；不引入打包器。

## Capabilities

### New Capabilities

- `dashboard-runtime-refresh`: 定义写后局部刷新策略与 Launcher 依赖不可用时的可恢复提示。

### Modified Capabilities

无。

## Impact

- Web UI：`ui/engine-client.js` 增强 `afterWrite`；各 dialog/render/backup/drop 调用点传入 patch 提示；项目入口面板增加依赖说明条。
- 测试：e2e/字符串契约断言局部刷新 API 与依赖提示文案；`npm run check` / `npm test`。
- Desktop：浏览器与 Desktop 共享同一 UI 逻辑。
