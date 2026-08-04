## Context

`afterWrite` 一律 `loadSnapshot({ silent: true, probe })`。多数 upsert/delete/inspect 的 success payload 已含 `aggregateRevision` 与 `item`/`deletedId`/`inspection`，足够局部更新。例外：路径/速记/项目 upsert 可通过 `tags` 名称创建新 Tag，而 payload 不回传新 Tag Item，此时必须 snapshot。批量添加只回传 id，导入/迁移改变面大，也必须 snapshot。Launcher `DEPENDENCY_UNAVAILABLE` toast 偏泛，项目入口行仅标“不可用”。

## Goals / Non-Goals

**Goals:**
- 常见单条 CRUD / pin / inspect / repair / tag / view 写成功后避免无必要的整表 snapshot。
- 缺本地 Tag、批量、导入等不安全场景仍走 snapshot，保证芯片与列表正确。
- Launcher 不可用时说明：Desktop App 才有启动能力；CRUD/目录管理仍可用。

**Non-Goals:**
- 不扩展 Action success payload Schema（不强制回传 tags）。
- 不做虚拟列表或渲染性能大改。
- 不改 Engine 单写者与 revision 语义。

## Decisions

### 1. `afterWrite(message, { probe, result, patch })`
- `patch.type`: `upsert` | `delete` | `inspection` | `snapshot`
- `upsert`：若 `item.tagIds` 中有未知 Tag → 退回 snapshot；否则替换/插入集合项并 `renderAll`
- `delete`：按 id 移除集合项
- `inspection`：就地更新 path/project 的 inspection
- 默认/`snapshot`：现有 `loadSnapshot`
- probe 仅在调用方需要时触发（项目相关）

### 2. 调用点迁移
- pin / 已知标签的 upsert / delete / tag / view / repair → 局部
- path/note/project 编辑保存（可能新建标签）、batch、import/migrate → snapshot
- inspect → inspection patch

### 3. Launcher 依赖提示
- 统一文案常量
- toast + 项目入口面板可见 banner（`launcherAvailable === false`）
- 不伪造 launcher 可用状态

## Risks / Trade-offs

- [漏判新 Tag] → unknown tagId 强制 snapshot
- [局部与他端并发] → revision conflict 仍整表刷新
- [banner 打扰] → 仅不可用时显示，可恢复后自动隐藏

## Migration Plan

1. 增强 `afterWrite` 与调用点。
2. 加入 Launcher banner/文案。
3. 更新测试与文档短注。
4. 回滚：Git revert；无 runtime 迁移。

## Open Questions

无。
