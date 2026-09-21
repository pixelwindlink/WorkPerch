## Why

速记与文件路径共享相同的 Tag Registry、usage 和保存视图数据基础，但速记页目前缺少对应入口与过滤/最近使用界面，导致同一套 Engine 能力在不同目录中的可达性和效率不一致。

## What Changes

- 在速记页提供完整共享 TAG Registry 入口，并支持按速记引用过滤 Registry。
- 在速记页增加基于现有 Engine-owned usage 的最近/常用入口，点击可定位对应速记。
- 在速记页增加共享标签分组过滤，并让清除筛选、保存视图和恢复视图包含该标签条件。
- 继续使用现有 `tagIds`、`usage` 和 Tag Actions，不新增业务状态字段或 UI 私有事实来源。

## Capabilities

### New Capabilities

- `note-entry-parity`: 定义速记页的 TAG Registry、最近/常用入口和标签分组过滤能力，以及与文件路径页一致的 Engine-owned 数据边界。

### Modified Capabilities

- `dashboard-web-ui-modules`: 要求模块化 UI 在速记页同步渲染共享 Tag Registry、标签筛选和 usage 入口，不建立第二份业务状态。

## Impact

主要影响 `index.html`、`ui/state.js`、`ui/events.js`、`ui/render-notes.js`、`ui/render-shared.js`、`ui/dialogs-tag-registry.js`、`styles.css`、Web UI E2E 契约测试、界面指引与 README。公开 EngineMessage Action、状态 Schema 和持久化格式不变。
