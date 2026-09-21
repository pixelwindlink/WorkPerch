# WorkPerch 工程约束

本工程是稳定 Engine ID `perch`、名称 `WorkPerch` 的独立有状态 Engine。它拥有本地开发工作区的路径、速记和项目入口目录，以及这些目录的查询、修改、备份、恢复和受限 registered loopback endpoint liveness 探测。

## 必须保持的边界

- 服从 Generic Engines 根 `AGENT.md`、EngineMessage v1.0 和 `openspec/architecture/generic-engine-runtime-architecture.md`。
- 不修改、复制演进或向 EngineMessage v1.0 顶层加入自定义字段。
- 保持 Inbound Boundary → Business Core → Outbound Boundary：Domain/Application 不得依赖 HTTP、DOM、CLI、文件系统、数据库、浏览器 `localStorage` 或具体 Probe Client。
- 只有 Composition Root 可以认识具体 Adapter；Port 必须窄且由 Business Core 声明。
- CLI、HTTP、Provider 和 Web UI 必须复用同一 validator、dispatcher、Application 和 Domain，不建立 UI 私有业务 API。
- Electron Desktop Shell 是 Perch + Project Launcher 的 Composition Host，同时复用现有 Web/HTTP 边界；必须保持 `nodeIntegration: false`、`contextIsolation: true`，preload 仅允许解析用户主动拖入 File 的绝对路径、通过固定 allowlisted channel 读取/切换当前主窗口 always-on-top、请求 Main Process 在 Finder 中打开已登记绝对目录或定位文件，以及订阅 Main Process 发出的召唤（summon）通知以打开快速面板；禁止任意 IPC、文件执行、Launcher IPC 和 Renderer 文件系统访问。
- Perch Application 只可通过注入的窄 `EngineClient.send(EngineMessage)` 调用 `project-launcher` 公开 Action；禁止 import Launcher Business Core、读取其 runtime 或向 Renderer 暴露进程对象。
- Action Catalog 与 `contracts/actions/*.schema.json` 是公开 payload Contract 的唯一事实来源；运行时和测试必须读取这些文件。

## 状态与运行

- 状态模式固定为 `single-writer`，运行根由 `PERCH_RUNTIME_DIR` 控制。
- Server 是正常唯一写入者；CLI 只能是显式 Server Client 或显式绝对隔离目录下的 Standalone Exclusive writer。
- 不能在锁冲突或 Server 不可用时静默 fallback 为第二写入者。
- 状态提交必须完整校验、原子替换并保留上一 revision 备份；损坏状态不得静默覆盖。
- 不向源码、Git、`runtime_data/` 提交用户状态、锁、备份、测试报告或绝对路径数据。
- 项目 seed 只用于首次初始化，必须从注入的 Generic Engines root 派生；状态创建后 aggregate 是唯一权威。

## 明确非职责

- 不是 Runtime、Router、Observability Plane、Shell 执行器、文件管理器、凭据管理器、远程扫描器或其他 Engine 健康权威。
- 不读取或写入其他 Engine 的数据库、运行目录或内部文件。
- 旧项目 command 只能保存、展示、复制或作为待确认的保守配置建议；Perch 禁止 `child_process.exec` 或等价任意命令执行。真实启动只由 Project Launcher 以结构化 executable/args 和 `shell: false` 完成。
- Probe 只能探测已登记项目的 loopback HTTP(S) endpoint，必须保持超时和最大并发 4，不得接受请求临时指定的任意 URL。
- Project Launcher 是唯一声明的 EngineClient 依赖；普通 Perch Server/CLI 未注入时必须仅对 launch Action 返回 `DEPENDENCY_UNAVAILABLE`，不得影响基础 CRUD。

## Web 与迁移

- Web UI 只保留 theme、搜索、Tab、表单、toast 等界面状态；groups/paths/notes/projects 必须来自 `perch.snapshot.get`。
- Tag 是跨 Path/Note/Project 共享的独立 Registry 实体；三类记录只通过 `tagIds` 引用。名称和颜色必须通过 Tag Action 统一修改，旧 `groupId/groupColor` 只允许在 1.x → 2.0 迁移边界读取。
- 所有写入必须携带 `expectedRevision`；冲突时提示并重新读取 snapshot，不在浏览器静默合并。
- 直接打开 HTML 或 Server 断开时必须只读，不得回退为 localStorage 业务写入者。
- legacy paths/notes 仅在首次成功连接后检测；迁移必须明确确认、先 dry-run、再正式 `perch.backup.import`。
- 迁移成功前后都不得自动删除旧 localStorage；仅允许独立确认的手动清理，theme 保留。
- 保持高密度 key-value UI、吸顶搜索、复制、置顶、拖放和 200ms 图标展开交互。
- Web UI 以 `app.js` 为 ES Module 组合入口，客户端逻辑按职责放在 `ui/`（engine-client、render、dialogs、drop、desktop、events 等）；禁止把 UI 模块并入 `src/` Business Core，禁止引入打包器或生产依赖。
- Desktop 必须拥有组合式 Perch Server 和独立 Project Launcher 生命周期；端口被其他 Perch Server 占用时明确失败，不得复用未注入 Launcher 的 Server。Launcher 初始化失败时可继续启动 Perch CRUD，但 launch Action 必须显示依赖不可用。
- Desktop 窗口最小尺寸保持 `360 × 320` 可用；全局置顶必须显式、可撤销，macOS 使用 floating 层级并跨 Spaces/全屏可见，普通浏览器不得显示伪置顶控制。
- 本机路径“打开”必须经 Main Process 校验绝对路径和当前主窗口 sender；目录可用 Finder 打开，文件只能 Finder 定位，禁止恢复 `file://` 页面导航或把项目 command 当作打开动作执行。
- macOS 打包必须将 mutable runtime 排除在 App 外，只能携带只读 governance Contract，以及 Project Launcher 的 manifest/contracts/src 最小运行资源；Launcher tests、OpenSpec 和 runtime_data 不得进入 App。构建输出进入被忽略的 `dist/desktop/`，本机安装入口为 `/Applications/Perch.app`。

## 修改与验证

- 优先使用 Node.js 标准库和零生产依赖实现。
- 变更 Business Rule、Action、状态 Schema、Transport 或迁移语义时，先更新仍未归档的 OpenSpec Change，并同步测试与文档。
- 不降低 Schema、Contract 或 conformance 约束来换取通过。
- 完成修改后至少运行 `npm run check`、相关分层测试、`npm test` 和 `openspec validate --all --json`。
- 注册表只有在根黑盒 `node conformance/runner.mjs --engine perch --json` 真正通过后才能标为 `engine/conformant`。
- 不自动归档 OpenSpec Change，不创建 Git commit，不清理或覆盖用户已有未提交文件。

## 项目级 Skills

- 完整 Skill 统一位于 `.agents/skills/`。
- 使用 `.agents/skills/operate-perch/SKILL.md` 启动、测试、调用或诊断本 Engine；它必须保持 Server/Standalone 单写入者边界。
- 使用 `.agents/skills/register-project-entry/SKILL.md` 将其他工程接入 Perch 项目入口。
- `skills/register-project-entry/SKILL.md` 是旧路径兼容 Adapter，必须先委托 canonical Skill，不能维护第二份注册流程。
- Skill 必须通过 `engine.manifest.json` 且 `id=perch` 发现工程根，不得依赖固定父目录层数。
