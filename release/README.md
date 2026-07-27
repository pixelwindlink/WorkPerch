# Dashboard macOS Release

`Dashboard-1.2.0-arm64.dmg` 是面向当前 Apple Silicon Mac 的本地便捷安装镜像。

1. 打开 DMG。
2. 将 `Dashboard.app` 拖到 `Applications` 快捷方式。
3. 从 Finder“应用程序”、Spotlight 或 Launchpad 启动 Dashboard。

应用采用本机 ad-hoc 签名，未进行 Developer ID 签名或 Apple notarization。DMG 不包含 Dashboard runtime state、锁、备份或用户数据；运行数据仍保存在 App 外部的 Dashboard runtime directory。

生成后的 SHA-256 记录在同目录的 `Dashboard-1.2.0-arm64.dmg.sha256`。
