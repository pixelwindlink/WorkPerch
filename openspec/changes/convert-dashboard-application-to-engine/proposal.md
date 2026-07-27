## Why

Dashboard 当前只是由浏览器 `localStorage` 持有业务状态的静态 Application，无法通过稳定协议被独立调用、组合、验证或安全地共享给多个客户端。现在需要在保留现有高密度 UI 和备份兼容性的同时，将路径、速记和项目入口目录迁移为由 `dashboard` 单一写入的正式 Engine 状态，并满足 Generic Engines 的 Provider、EngineMessage、CLI、状态隔离和 conformance 门禁。

本 Change 引用并服从唯一架构设计权威 `openspec/changes/define-generic-engine-runtime-architecture/design.md`；不修改或复制演进 EngineMessage v1.0。

## What Changes

- 将稳定身份冻结为 Engine ID `dashboard`、名称 `Dashboard Engine`，明确其职责是管理本地开发工作区的路径、速记和项目入口目录，并提供查询、修改、备份、恢复和受限 endpoint liveness 探测。
- 新增 manifest 1.1、Provider/SPI、Action Catalog、Action payload Schema、统一 Validator/Dispatcher，以及复用同一业务核心的 CLI、HTTP、in-process 和 Web UI 入口。
- 建立 Inbound Boundary → Business Core → Outbound Boundary 的三层依赖；Domain/Application 不依赖 HTTP、DOM、CLI、文件系统、浏览器存储或具体网络实现。
- 将业务状态迁移为 `DASHBOARD_RUNTIME_DIR` 下的版本化 JSON aggregate，由 Server 或显式 Standalone Exclusive CLI 单写，使用独占锁、原子写入、备份和 aggregate revision 防止静默覆盖。
- 将项目入口从 `app.js` 长期硬编码常量迁移为首次状态初始化 seed；启动命令只作为字符串数据保存和返回，绝不由服务端执行。
- 将浏览器端口探测替换为 Engine-owned 受限 Probe Adapter，只允许已登记项目的 loopback endpoint，并限制超时和并发。
- 保留现有文件路径、项目入口和速记 UI，以及搜索、过滤、复制、置顶、拖放、导入导出体验；所有业务读写改走 `POST /engine-message`。
- 保持 `dashboard-key-value-list` version 1 备份读取兼容，并提供 `merge`、`replace`、`dryRun` 的正式导入 Action。
- 为路径分组增加可选 `groupColor`，让 GROUP 作为更醒目的自定义彩色标签展示，同时保持现有无颜色状态和 legacy `color` 字段可读。
- 新增可选 Electron Desktop Shell，复用同一 Web UI 和 Engine Server，并通过最小 preload bridge 获取用户主动拖入文件/文件夹的真实本机绝对路径；普通浏览器继续保留安全降级行为。
- **BREAKING**：浏览器 `localStorage` 不再是 paths/notes 的业务真相；直接打开 `index.html` 不再提供完整可写模式，只显示需要连接 Dashboard Engine Server 的只读/迁移提示。
- **BREAKING**：CLI 与 Server 不再能无协调地打开同一状态根；冲突返回 `STATE_OWNERSHIP_CONFLICT`，不会静默 fallback 为第二写入者。
- 更新根注册表中的 dashboard 分类、manifest、状态所有权与真实证据；只有全部黑盒验证通过后才晋级 `engine/conformant`。

## Capabilities

### New Capabilities

- `dashboard-engine-boundary`: Dashboard Engine 的稳定身份、职责/非职责、Provider 生命周期、三层依赖和 Runtime 接入边界。
- `dashboard-engine-actions`: 标准 Action 与路径、速记、项目、探测、备份 Action 的 payload、结果、错误和 revision 语义。
- `dashboard-engine-state`: single-writer 状态所有权、运行目录、Schema 版本、锁、原子写入、恢复、损坏处理和乐观并发。
- `dashboard-engine-transports`: CLI、HTTP、in-process 与 Web UI 共享 dispatcher/use-case 的 Transport 一致性、安全限制和失败语义。
- `dashboard-legacy-migration`: legacy localStorage 与 `dashboard-key-value-list` version 1 的确认式、可验证、无破坏迁移和兼容策略。

### Modified Capabilities

无。项目当前没有已发布的 Dashboard Engine 主规格；根架构与 EngineMessage Contract 作为上位约束引用，不在本 Change 中修改。

## Impact

- Dashboard 工程：新增 OpenSpec、manifest、contracts、Provider、Inbound/Application/Domain/Outbound/Composition、CLI、运行数据边界和测试；现有静态资源迁移到 `public/` 并改为 EngineMessage Client。
- Dashboard 数据：paths、notes、projects 从浏览器/源码迁移到 Engine-owned aggregate；theme 继续作为浏览器偏好。
- 外部入口：保留默认 loopback HTTP 端口 4173，新增 `POST /engine-message` 和统一 CLI；不增加 UI 私有业务 API。
- 根治理：只更新 dashboard 注册记录和为新分类/证据所必需的 conformance 断言；不修改其他 Engine，不修改 EngineMessage v1.0。
- 依赖：优先使用 Node.js 标准库；若边界 JSON Schema 校验需要依赖，将仅由 Validator Adapter 使用并在 Design 中说明。
