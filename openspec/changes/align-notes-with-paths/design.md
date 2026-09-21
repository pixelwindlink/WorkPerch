## Context

Dashboard 的 Path、Note、Project 已共享 `tags` Registry，并且三类记录都拥有 `usage` 与 `tagIds`。文件路径页已经把这些字段用于 TAG 管理、标签过滤和最近入口；速记页当前只渲染 TAG chips 和搜索，能力入口不完整。Web UI 必须继续只消费 Engine snapshot，并通过现有 Actions 写入。

## Goals / Non-Goals

**Goals:**

- 让速记页可直接管理完整的共享 Tag Registry，并能从速记上下文查看相关标签。
- 用现有 `usage.lastUsedAt` / `usage.count` 呈现最近和常用速记。
- 用单个共享 Tag ID 过滤速记，并纳入保存视图。
- 复用现有样式与交互模式，保持窄屏可达性。

**Non-Goals:**

- 不新增或修改 EngineMessage Action、状态 Schema、持久化与迁移语义。
- 不把标签复制为速记私有 Registry，也不在 `localStorage` 保存业务过滤事实以外的数据。
- 不改变极简模式只面向文件路径主入口的现有定义。

## Decisions

1. 在 `state` 增加纯界面状态 `noteCategory`，并由 `renderNoteGroups` 从 `state.tags` 重建 select。选择值始终是 Tag Item ID；标签重命名或换色无需修改速记记录。
2. 速记页的 TAGS 按钮打开同一个 `groupRegistryDialog`。`openGroupRegistry` 接收可选 Registry filter，新增 `notes` 过滤条件，仅显示至少被一条速记引用的 TAG；编辑、创建、删除仍调用现有 Tag Actions。
3. `renderNotes` 同时渲染一个独立 `noteUsageHome`，最近与常用各最多八项，排序与文件路径一致。点击 chip 清除速记查询和标签过滤、切换到速记页、滚动并高亮对应行；复制正文继续通过现有 `copyText(..., { kind: "note" })` 记录 usage。
4. 保存/恢复 `scope=notes` 的视图时，将 `noteCategory` 映射到现有 `savedViews.tagIds`，不扩展 view Contract。
5. 最近入口的横向滚动样式复用 `.usage-home`，滚轮绑定抽为共享 UI helper，避免 Path/Note 两套滚动实现漂移。
6. `.usage-home[hidden]` 使用显式 `display: none !important`，确保通用 grid 声明不会覆盖 HTML hidden 空态语义。

## Risks / Trade-offs

- [同一个 Tag Registry 从两个页进入，用户可能不清楚其全局性] → 按钮仍命名 `TAGS`，对话框保留“路径、速记和项目统一更新”的共享说明，并在速记入口默认过滤为“速记引用”。
- [视图只支持一个标签条件] → 与现有路径页和 `savedViews.tagIds[0]` 行为保持一致，不在本变更扩大组合过滤语义。
- [最近与常用集合可能重复] → 与文件路径页保持一致，分别表达时间与频率维度，不去重以免改变用户预期。
- [通用 `.usage-home` 的 display 声明可能覆盖 hidden] → 为 hidden usage surface 增加高优先级隐藏规则，并以 Web UI 契约测试锁定零占位行为。

## Migration Plan

部署仅替换静态 Web UI 与测试/文档。现有 aggregate、备份和浏览器业务状态不需要迁移；回滚静态文件即可恢复原界面。

## Open Questions

无。
