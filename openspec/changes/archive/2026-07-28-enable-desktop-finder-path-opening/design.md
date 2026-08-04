## Context

文件路径行和无 Web URL 的项目入口当前生成 `file://` 链接。Web UI 由 `http://127.0.0.1:4173` 提供，Electron Main Process 又会拒绝离开该 Origin 的页面导航，因此点击“打开”无法到达 Finder。Desktop preload 目前已经通过固定方法提供拖入路径解析和窗口置顶，这次需要在同一窄边界内增加真正可用的本机路径操作。

## Goals / Non-Goals

**Goals:**

- 让 Desktop App 中现有路径“打开”按钮真实打开 Finder。
- 目录直接在 Finder 中打开，文件在 Finder 中定位并选中。
- 拒绝非绝对路径、不存在路径、NUL、超长值和非主窗口 IPC sender。
- 普通浏览器提供明确、安全、可理解的降级反馈。
- 不改变 Engine aggregate、revision、Action Catalog 或单写入者状态所有权。

**Non-Goals:**

- 不执行项目 command、脚本、可执行文件或任意 shell。
- 不向 Renderer 暴露 `fs`、Electron `shell` 或任意 IPC channel。
- 不扫描目录内容，不实现文件管理器、终端或编辑器启动器。
- 不让 Server/CLI 打开宿主图形界面；该能力只属于 Electron Desktop Host。

## Decisions

### 1. 使用固定 Desktop IPC，而不是继续尝试 file URL 导航

Preload 新增 `openPathInFinder(path)`，内部只能调用固定 channel `dashboard:path:open-in-finder`。Main Process 使用现有主窗口 sender 校验，Renderer 不能选择 channel，也不能直接访问 Electron `shell`。

继续使用 `file://` 的方案被拒绝，因为 HTTP 页面、普通浏览器与 Electron 导航保护都会限制这种跨 Origin 本机访问，而且失败反馈不可靠。

### 2. Main Process 先识别路径类型，再选择 Finder 行为

Main Process 对输入执行字符串类型、长度、NUL 和 `path.isAbsolute` 校验，再使用 `fs.stat` 确认路径存在：

- 目录调用 `shell.openPath(directory)`，由 Finder 打开该目录；
- 文件调用 `shell.showItemInFolder(file)`，由 Finder 打开父目录并选中文件；
- 其他文件系统类型也只在 Finder 中定位，不尝试执行。

直接对所有路径调用 `shell.openPath` 的方案被拒绝，因为文件或 App 可能由默认程序执行，不符合 Dashboard 不是 shell/launcher 的既有边界。

### 3. Renderer 使用语义化按钮和显式降级

路径列表与无 Web URL 的项目入口改用按钮事件调用 Desktop bridge。成功时 toast 区分“已在 Finder 打开目录”和“已在 Finder 定位文件”；失败时显示受限错误。普通浏览器中同一按钮不会制造假成功，而是提示必须使用 Dashboard Desktop App。

项目 Web URL 仍保持现有 HTTPS/HTTP 外部打开行为，不经过本机路径 IPC。

### 4. 作为 1.2.1 Desktop 修复发布

源码、package、Engine manifest 和 App Bundle 统一升级为 1.2.1。重新构建后覆盖 `/Applications/Dashboard.app`，验证 App 内 manifest、签名、启动 health 和 Finder 路径控制；发布 DMG 更新为 `Dashboard-1.2.1-arm64.dmg`。不自动创建 Git commit 或 tag。

打包输入必须排除工程 `release/`。否则历史 DMG 会被封装进 `app.asar`，再被下一版 DMG 二次压入，造成递归式体积膨胀。测试需要把 `release` 固定为构建排除项。

## Risks / Trade-offs

- [记录指向不存在或无权限路径] → 在 Main Process stat 阶段失败并向 UI 返回明确提示，不执行后续 shell 操作。
- [IPC 被非 Dashboard 页面调用] → 校验 `BrowserWindow.fromWebContents(event.sender)` 必须等于当前主窗口。
- [本机路径被当作可执行入口] → 目录仅打开 Finder，文件仅 Finder 定位；不调用文件执行或项目 command。
- [普通浏览器仍无法直接打开本机路径] → 明确提示平台限制，不伪造能力，也不降低浏览器安全模型。
- [历史 release 资产进入 App Bundle] → packager 明确排除 `release/` 并用回归测试固定，DMG 只包含运行所需 App 资源。

## Migration Plan

1. 增加独立可测试的路径校验/Finder 控制器及固定 IPC。
2. 替换 Renderer 中失效的 `file://` 打开元素并补充浏览器降级。
3. 运行 Dashboard 测试、OpenSpec 和 Engine conformance。
4. 构建、安装并启动 Dashboard 1.2.1，使用真实临时目录验证 Finder 行为。
5. 生成并验证 1.2.1 DMG 后删除临时构建副本，避免出现重复 App。

回滚为恢复 1.2.0 App 和源码；没有状态或 Contract 迁移。

## Open Questions

无。当前“打开”语义明确固定为 Finder：目录打开、文件定位。
