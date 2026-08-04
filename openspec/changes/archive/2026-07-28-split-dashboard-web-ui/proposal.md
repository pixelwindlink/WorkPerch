## Why

Dashboard Web UI 的全部客户端逻辑集中在约 1500 行的 `app.js` 中，渲染、EngineMessage 调用、拖放、TAG Registry、Desktop bridge 和事件绑定交织在一起。后续交互修复（header 换行、dialog 内确认）和回归测试成本越来越高，而业务边界本身并未要求 UI 必须单文件。现在拆分可以在不改 Action/状态协议的前提下降低维护成本。

## What Changes

- 将 `app.js` 拆为浏览器 ES Module 组合入口与若干按职责划分的 UI 模块（连接/snapshot、列表渲染、dialog、TAG Registry、拖放、Desktop、事件绑定等）。
- `index.html` 改为以 `type="module"` 加载 UI 入口；继续由 Dashboard Server / Desktop Host 提供静态资源，不引入打包器或新的生产依赖。
- 保持现有 EngineMessage 调用面、只读断开语义、theme/搜索/Tab 等客户端状态、以及 Desktop preload 能力不变。
- 补充针对模块边界与关键 UI 行为的回归覆盖（至少覆盖入口加载、连接只读、TAG Registry 删除确认流）。
- 不修改 Action Catalog、aggregate Schema、HTTP `/engine-message` 或 Project Launcher 协议。

## Capabilities

### New Capabilities

- `dashboard-web-ui-modules`: 定义 Dashboard Web UI 的模块化组织、单一组合入口、以及拆分后必须保持的客户端行为边界。

### Modified Capabilities

无。

## Impact

- Web UI：`index.html`、`app.js` → `app.js`（薄入口）+ `ui/**` 模块；`styles.css` 原则上不动，除非为模块化测试需要稳定 hook。
- Electron Desktop：asar 需包含拆分后的静态模块文件；仍通过现有 HTTP/静态边界加载 UI，不新增 Renderer Node 权限。
- 测试：`tests/e2e/http-ui.test.mjs` 等对 `app.js` 全文字符串断言需改为按模块/入口契约断言；`npm run check` 需覆盖新模块语法检查。
- 文档：`AGENT.md` / `README.md` 补充 UI 模块布局说明；不改变 Engine 公开合同。
