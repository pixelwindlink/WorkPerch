## Context

UI 已拆到 `ui/` 模块。删除路径/速记/项目、保存视图、导入 dry-run、legacy 迁移/清理、TAG 删除仍调用 `window.confirm()`。TAG 删除已用“先关 dialog 再 confirm”绕过 Chromium 限制，但其他 dialog 内确认（legacy/import 若未来嵌套）仍脆弱，且关闭-再开造成闪烁。TAG Registry 对有引用标签仅 `aria-disabled` + toast，缺少筛选与引用摘要。窄屏 media query 曾隐藏 header quiet-button，虽已部分回退，仍需明确“关键动作可达”契约。

## Goals / Non-Goals

**Goals:**
- 统一、可在 modal 之上使用的应用内确认 Promise API。
- TAG Registry 可筛选未使用/使用中，并看清引用概况。
- 窄屏（含约 360px 宽）保留排序/视图/导入导出与主搜索可达。
- 保持现有领域规则：有引用的 TAG 不可删。

**Non-Goals:**
- 不新增“强制删除并级联摘引用”的 Engine Action（可另立 Change）。
- 不重做整体视觉设计，不引入组件框架。
- 不改备份/迁移业务语义，只换确认 UI。

## Decisions

### 1. 应用内 `<dialog id="confirmDialog">` + `requestConfirm()`
- **选择**：单一确认 dialog，`showModal()`，返回 `Promise<boolean>`；支持 `danger` 样式与自定义按钮文案。
- **理由**：可叠在其他 dialog 之上（浏览器允许嵌套 modal dialog），彻底摆脱原生 confirm；API 小、零依赖。
- **备选**：继续关外层再原生 confirm → 闪烁且易漏改；两段式按钮（再点确认）→ 学习成本高、不适合导入文案较长的场景。

### 2. 替换范围
替换所有业务 `confirm()`：
- 删除 path/note/project/view/TAG
- 导入 dry-run 提交
- legacy 迁移确认与清理确认
保留 `prompt()`（保存视图名、路径修复）本 Change 不强制替换。

### 3. TAG Registry 筛选与引用摘要（纯 UI）
- 筛选：`all | unused | in-use`，仅影响列表渲染。
- 行内 `small`：由“N 条记录引用”细化为 `路径 a · 速记 b · 项目 c`（为 0 的段可省略；全 0 显示“未使用”）。
- 使用中删除：保持阻塞；toast/确认无需发送 delete。
- **不**在本 Change 做“一键清除引用”。

### 4. 窄屏优先级
- ≤600px：不再隐藏 header 工具按钮；允许 header-tools 换行（已有）。
- sticky 条：保留搜索与添加；次要清除/分段可继续折叠，但不得去掉主搜索。
- 用 CSS + 少量 class 调整，避免 JS 布局引擎。

## Risks / Trade-offs

- [嵌套 dialog 焦点/Esc] → 确认框取消/Esc 只关确认框；测一遍 TAG/legacy。
- [漏替换某 confirm] → e2e 扫描 `ui/**` 禁止业务 `confirm(`（测试辅助除外）。
- [筛选状态丢失] → 筛选为 Registry 打开期间的局部变量即可，不必持久化。

## Migration Plan

1. 落地确认组件并逐个替换调用点。
2. 增强 TAG Registry 渲染与筛选。
3. 调整窄屏 CSS。
4. 更新测试与文档；`npm run check` / `npm test` / openspec validate。
5. 回滚：Git revert；无 runtime 迁移。

## Open Questions

- 无阻塞项。若后续要“摘引用后删除”，另提 Domain Change。
