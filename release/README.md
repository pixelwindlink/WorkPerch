# Dashboard macOS Release

`Dashboard-2.1.0-arm64.dmg` 是面向当前 Apple Silicon Mac 的本地便捷安装镜像。

2.1.0 相对 2.0.0 主要包含：

- Web UI 模块化（`app.js` + `ui/` ES modules）。
- 应用内确认框，替换业务侧原生 `confirm()`。
- TAG Registry 全部/未使用/使用中筛选与引用摘要。
- 写后局部刷新与 Project Launcher 依赖恢复提示。
- Desktop Finder 打开本机路径。

2.0.0 累计包含：

- v1.4 路径状态、批量拖入、项目识别和保持记录 ID 的路径修复。
- v1.5 共享多标签 Registry、使用统计、智能排序和保存视图。
- v2.0 独立 Project Launcher Engine、结构化 allowlist 和 Dashboard 一键启动/停止。

1. 打开 DMG。
2. 将 `Dashboard.app` 拖到 `Applications` 快捷方式。
3. 从 Finder“应用程序”、Spotlight 或 Launchpad 启动 Dashboard。

应用采用本机 ad-hoc 签名，未进行 Developer ID 签名或 Apple notarization。DMG 不包含 Dashboard runtime state、锁、备份或用户数据；运行数据仍保存在 App 外部的 Dashboard runtime directory。

生成后的 SHA-256 记录在同目录的 `Dashboard-2.1.0-arm64.dmg.sha256`。
