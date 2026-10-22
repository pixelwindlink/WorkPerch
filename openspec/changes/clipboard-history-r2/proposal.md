# Change: Desktop 剪贴板历史（R2）

## Why

Owner 需要在 WorkPerch Desktop 内回看近期系统剪贴板文本并再次复制，而不依赖第三方闭源工具。

## What

- Electron 主进程轮询 `clipboard.readText()`，环形缓冲最多 100 条（满则丢弃最旧），持久化到 `userData/clipboard-history.json`。
- 设计参考开源 [Maccy](https://github.com/p0deje/Maccy) 的「本地环形历史 + 去重」模式；实现为 Engine 自有代码，不引入运行时依赖。
- Renderer「剪贴板」Tab 列表展示预览，一键写回系统剪贴板。

## Evidence

- `electron/clipboard-history.mjs`、`tests/unit/clipboard-history.test.mjs`
- UI：`ui/render-clipboard.js`、`index.html#clipboardPanel`
