# Change: 速记长短文本 UI 过滤（R3）

## Why

Owner 2026-10-19 裁决 R3：速记支持全部 / 长文本 / 短文本（默认约 100 字、可设置）过滤；阈值存用户偏好，过滤在 UI 层实现，不扩展 Action 查询。

## What

- 速记 Tab 增加长度筛选（全部 / 短 / 长）与可配置短文本字数上限（localStorage）。
- 仅影响列表渲染与可见计数，不写 Engine 状态。

## Impact

- Affected: Web UI（`index.html`、`ui/render-notes.js`、`ui/events.js`、`ui/state.js`）
- Non-goals: 剪贴板 R2、窗口恢复 R4、项目入口下线 R1
