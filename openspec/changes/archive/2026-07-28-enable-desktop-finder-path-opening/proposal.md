## Why

Dashboard 的路径与无 URL 项目入口虽然显示“打开”图标，但当前实现依赖从 HTTP 页面导航到 `file://`，该导航会被浏览器安全限制和 Electron 自身的跨 Origin 导航保护拦截，因此桌面应用最基本的本机路径打开能力实际不可用。

## What Changes

- 为 Electron Desktop Shell 增加固定、受 Main Process 校验的 Finder 路径打开能力。
- 目录在 Finder 中直接打开；文件在 Finder 中定位并选中，不执行文件内容或任意命令。
- 文件路径列表和无 Web URL 的项目入口统一使用该 Desktop 能力，不再依赖失效的 `file://` 页面导航。
- 普通浏览器继续保持安全降级：明确提示浏览器不能打开本机路径，而不是提供形同虚设的按钮行为。
- 对不存在、无权限、非绝对路径和非法 IPC sender 返回可理解错误，不影响 Dashboard Engine 业务状态。

## Capabilities

### New Capabilities

- `dashboard-desktop-path-opening`: 定义 Dashboard Desktop 如何通过窄 IPC 在 Finder 中安全打开目录或定位文件，以及普通浏览器的明确降级行为。

### Modified Capabilities

无。

## Impact

- Electron Main/Preload：新增一个固定 channel 和受限本机路径操作；继续禁止任意 IPC、shell 命令和 Renderer 文件系统访问。
- Web UI：路径和项目入口“打开”按钮改为显式 Desktop Action，并提供成功/失败反馈。
- 测试：覆盖路径校验、目录打开、文件定位、IPC sender 边界、Renderer 行为和浏览器降级。
- 打包 App：需要重新构建并更新 `/Applications/Dashboard.app`；不修改 runtime aggregate、Action Catalog 或 EngineMessage 业务协议。
