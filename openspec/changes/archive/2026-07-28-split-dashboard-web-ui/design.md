## Context

当前 Web UI 以经典脚本 `app.js`（约 1500 行）承载全部客户端逻辑：EngineMessage 客户端、snapshot 同步、三条列表渲染、多个 `<dialog>`、TAG Registry、拖放批量收录、legacy 迁移、theme/置顶、header 动态布局与事件绑定。`index.html` 通过 `<script src="./app.js" defer>` 加载。业务合同（Action Catalog、aggregate、HTTP）已在 Engine 侧拆清；UI 仍是单体，阻碍局部修复与针对性测试。

约束：零生产依赖、不引入打包器；Desktop Renderer 保持 `nodeIntegration: false` / `contextIsolation: true`；UI 不得成为第二状态写入者；静态资源由现有 Server/Desktop Host 提供。

## Goals / Non-Goals

**Goals:**
- 按职责拆分 UI 源码，保留单一浏览器入口与可预测的模块边界。
- 行为与现网一致：snapshot 驱动渲染、断开只读、Desktop bridge、header wrap、TAG 删除确认流。
- 用原生 ES Module 加载，不增加构建步骤。
- 让 `npm run check`、e2e/字符串契约测试跟随新布局，避免“只测旧单文件”。

**Non-Goals:**
- 不改 Action、Schema、迁移语义或 Launcher 协议。
- 不引入 React/Vue/打包器/CSS-in-JS。
- 不做视觉改版或大范围交互重写（确认组件统一化可另立 Change）。
- 不把 UI 模块搬进 `src/` Business Core；`src/` 仍只服务 Engine。

## Decisions

### 1. 使用原生 ES Modules，不用打包器
- **选择**：`index.html` 改为 `<script type="module" src="./app.js">`；模块文件放在 `ui/`，以相对路径 `import`。
- **理由**：工程已是 `"type": "module"`（Node），Server/Desktop 本就通过 HTTP 提供静态文件，浏览器原生模块足够；保持零依赖。
- **备选**：继续经典脚本 + IIFE 拼接 → 无真正边界；或引入 bundler → 违反零依赖与现有交付路径。

### 2. `app.js` 保留为薄组合入口
- **选择**：`app.js` 只负责创建共享 `state`/`elements`、装配模块、调用 `bindEvents` / `bindHeaderLayout` / `loadSnapshot` 等启动序列。
- **理由**：现有文档、检查脚本、asar 路径仍认 `app.js`；降低迁移噪音。
- **备选**：改名为 `ui/main.js` → 需同步更多引用与习惯。

### 3. 按职责切分，不按“文件行数均分”
建议首轮模块（可在实现时微调命名，但职责不得合并回单体）：

```text
ui/
  dom.js              # escapeHtml, icon, elements 查询辅助
  state.js            # 客户端 state 工厂 / STORAGE_KEYS
  engine-client.js    # engineAction, loadSnapshot, afterWrite, connection banner
  render-paths.js
  render-projects.js
  render-notes.js
  render-shared.js    # tags chips, sort/compare, saved views 渲染协作
  dialogs-path.js
  dialogs-note.js
  dialogs-project.js
  dialogs-tag-registry.js
  drop-batch.js
  backup-legacy.js
  desktop.js          # theme, always-on-top, finder open helpers
  header-layout.js
  events.js           # bindEvents 与顶层监听
app.js                # composition + boot
```

共享可变 `state` 通过显式传入或单一 `state` 模块导出；禁止模块间隐式挂 `window.*` 业务 API。

### 4. 测试策略跟随模块边界
- e2e/http-ui：从“整份 `app.js` 必须包含某字符串”改为：入口为 module、关键模块文件存在、以及仍可通过 HTTP 加载的行为探针（连接 banner、TAG dialog id 等）。
- `npm run check`：对 `app.js` 与 `ui/**/*.js` 做 `node --check`。
- 不要求本 Change 引入浏览器自动化框架。

### 5. Desktop / asar
- packager 已打包工程根静态文件；确保 `ignore` 不排除 `ui/`。
- 验证 asar 内同时存在 `app.js` 与 `ui/*.js`，且相对 import 可解析。

## Risks / Trade-offs

- [经典脚本 → module 的细微启动时序差异] → 保持 boot 顺序：theme → connection status → renderAll → bindEvents → header layout → tab → desktop → loadSnapshot；用现有 e2e/手工 Desktop 冒烟确认。
- [循环依赖（render ↔ dialog ↔ engine）] → engine-client 与 state 不依赖 render；dialog 依赖 engine-client；events 位于最上层。
- [多文件增加 asar/阅读面] → 用薄入口 + 稳定目录约定；README/AGENT 各补一段 UI 布局。
- [过度拆分导致来回跳转] → 首轮按上表职责，禁止“一函数一文件”。

## Migration Plan

1. 新增 `ui/` 模块，从 `app.js` 渐进搬迁，每搬一块保持 `npm run check` 与相关测试绿色。
2. 切换 `index.html` 为 module 入口。
3. 更新 check 脚本与 e2e 契约断言。
4. Desktop `npm run desktop:pack` 冒烟：页面加载、snapshot、TAG Registry 删除确认、header 换行。
5. 回滚：恢复单文件 `app.js` + classic script（Git revert）；不涉及 runtime state 迁移。

## Open Questions

- 无阻塞项。实现时可决定 `ui/**/*.js` 与 `ui/**/*.mjs` 后缀：默认 `.js`（与现网一致，HTTP `Content-Type` 已覆盖）。
