# WorkPerch

**上帝规则承认**

本规范的上帝规则永远只有以下两条，且不可被任何工程、项目、Agent 或其他文件覆盖、削弱或改写：

- **GOD-1**：`README.md` 是工程的唯一第一入口。
- **GOD-2**：`AGENTS.md` 是工程治理与 Agent 执行 Contract 的入口；它必须承认并路由工程权威信息，但不承担工程内全部事实的存储职责。

人在并行推进多件事时，散落各处的工程目录、知识库目录和剪贴片段需要一个集中的登记处 —— 一个能落脚、也能再出发的地方。这个工程提供的就是这一层：登记入口、感知状态、把人送过去。

WorkPerch 2.0（Engine ID：`perch`）通过 EngineMessage 管理本地开发工作区的文件路径、速记和项目入口目录，并提供路径状态感知、共享多标签、使用排序、保存视图、版本化备份，以及通过独立 Project Launcher Engine 实现的安全项目启动/停止。

它不是 Generic Engines Runtime、Message Router、Observability Plane、Shell 执行器、文件管理器、凭据管理器或其他 Engine 的状态/健康权威。Perch 自身不执行项目命令；Desktop 只把结构化 `cwd + executable + args[]` 经注入 EngineClient 发送给独立 `project-launcher`。

## 项目定位与职责

- 产品名：`WorkPerch`。项目 ID：`perch`
- 分类：`engine`
- 目的：登记本地路径、速记和项目入口，感知状态，再把人送到对应入口。
- 负责：本地路径、速记、项目入口、保存视图和备份聚合，以及通过注入 EngineClient 委托 Project Launcher。
- 不负责：Runtime/Router/Observability、任意 Shell 执行、其他 Engine 状态或健康权威。
- 状态所有者：Perch Server，或使用不同绝对 Runtime Root 的 Standalone Exclusive CLI；同一状态根只允许一个写者。

## 人类快速开始

前置：Node.js ≥ 22.13.0。下面的命令都在本工程根目录执行。

```bash
npm run check
npm test
PERCH_RUNTIME_DIR=/absolute/path/to/perch-runtime npm start
```

默认绑定 `127.0.0.1:4173`。已经有 Server 在写同一份状态时，用 `PERCH_SERVER_URL` 当客户端，不要再启动第二个写者。Standalone 必须另给一份绝对 `PERCH_RUNTIME_DIR`。

1. 人先读本 README，再读 `AGENTS.md`、`engine.manifest.json` 和 `architecture/README.md`。
2. 完整 EngineMessage CLI 使用 `node cli.mjs`。
3. 只依据实际命令、退出码和 EngineMessage 响应报告运行状态。

## 消费者面

| 消费者 | 公开入口 | 适用目的 | Contract / 权威 | 证据边界 |
|---|---|---|---|---|
| 人类 | `README.md`、`architecture/README.md` | 理解能力、启动和状态边界 | `AGENTS.md`、OpenSpec | 文档完整不等于运行通过 |
| Agent | `.agents/skills/` | 操作 Perch 或登记项目入口 | canonical `SKILL.md` | Manual/Prompt 不自动运行 |
| Program | `cli.mjs`、HTTP、Provider | EngineMessage 调用 | `contracts/action-catalog.json` 与 payload Schema | 文件存在不等于 Instance online |
| Operator / Platform | `server.mjs`、Electron | Server/Desktop 生命周期 | manifest、Composition Root | Server/Standalone ownership 分别验证 |

## Agent 入口

| Agent 入口 | Skill ID | 适用场景 | 人类输入 | 交接 Prompt | 预期输出 |
|---|---|---|---|---|---|
| `$operate-perch` | `operate-perch` | 检查、测试、启动、调用或诊断 Perch | 模式、Server URL/隔离 Runtime、请求或测试范围 | `.agents/skills/operate-perch/PROMPT.zh-CN.md` | 命令、响应、状态 owner 和验证证据 |
| `$register-project-entry` | `register-project-entry` | 将工程新增/更新到 Perch 项目入口 | 目标工程根、Server URL、项目公开事实 | `.agents/skills/register-project-entry/PROMPT.zh-CN.md` | added/updated、revision 和 snapshot readback |

## Skill 清单

| Skill ID | 类型 | 用途 | canonical SKILL | 中文说明书 | 交接 Prompt |
|---|---|---|---|---|---|
| `operate-perch` | `operations` | 安全操作和诊断 Perch | `.agents/skills/operate-perch/SKILL.md` | `.agents/skills/operate-perch/MANUAL.zh-CN.md` | `.agents/skills/operate-perch/PROMPT.zh-CN.md` |
| `register-project-entry` | `capability` | 通过公开 Action 登记项目入口 | `.agents/skills/register-project-entry/SKILL.md` | `.agents/skills/register-project-entry/MANUAL.zh-CN.md` | `.agents/skills/register-project-entry/PROMPT.zh-CN.md` |

## CLI 清单

| 命令 | 用途 | 输入 | stdout/输出 | 读写属性 | 状态所有者 |
|---|---|---|---|---|---|
| `node cli.mjs` | 调用完整 EngineMessage | stdin 或 `--message-file`；可选 `--server-url` | 恰好一个 EngineMessage | 读取 / 写入，取决于 Action | Server Client 或隔离 Standalone owner |
| `node server.mjs` | 启动 HTTP/Web Server | `PERCH_RUNTIME_DIR` 与配置 | 服务生命周期/诊断到 stderr | 写入 | Perch Server |

## 公共 Contract

- 架构权威：`../../openspec/architecture/generic-engine-runtime-architecture.md`
- 项目 OpenSpec：`openspec/changes/convert-perch-application-to-engine/`
- 公共协议：根 EngineMessage v1.0；Action Catalog 与 payload Schema 位于 `contracts/`
- manifest：`engine.manifest.json` 1.2；消费者面和 Provider 声明以该文件为准
- 错误与并发：结构化 EngineMessage error、`expectedRevision` 和 `PERCH_REVISION_CONFLICT`

## 状态、安全与运行数据

- `runtime_data/` 是默认运行边界；正式运行可注入绝对 `PERCH_RUNTIME_DIR`。
- aggregate、锁、备份和用户路径不得进入 Git；CLI 与 Server 不得共享同一状态根成为竞争写者。
- Perch 不执行保存的 command；loopback probe 只针对已登记 endpoint，最多并发 4。
- Desktop 使用 `contextIsolation: true`、`nodeIntegration: false`，不向 Renderer 暴露任意文件系统或 Launcher IPC。

## 工程文件地图

| 路径 | 类型 | 职责 | Git / 生命周期 |
|---|---|---|---|
| `.agents/` | agent-capability | canonical Skills 与受治理资源 | tracked；Prompt/Manual 仅供人类 |
| `.gitignore` | tooling | 本地与 Runtime 忽略边界 | tracked |
| `AGENTS.md` | agent-contract | Agent、安全和状态所有权约束 | tracked |
| `README.md` | human-guide | 人类入口和项目说明 | tracked |
| `app.js` | presentation | Web UI 组合入口 | tracked |
| `architecture/` | architecture | 项目架构说明 | tracked |
| `cli.mjs` | transport | EngineMessage CLI | tracked |
| `contracts/` | contract | Action Catalog 与 payload Schema | tracked；版本化 |
| `electron/` | presentation | Desktop Composition Host | tracked |
| `engine.manifest.json` | identity | Engine 身份、Provider 和消费者声明 | tracked；Contract |
| `index.html` | presentation | Web 页面入口 | tracked |
| `openspec/` | contract | 项目规格与 Change | tracked |
| `package-lock.json` | dependency-lock | Node 依赖锁 | tracked；机械生成 |
| `package.json` | build-metadata | scripts、依赖与包身份 | tracked |
| `prompts/` | resource | 项目内部 Prompt 资源 | tracked；不等于 Agent Skill |
| `release/` | release | Desktop 发布配置/资源 | tracked |
| `runtime_data/` | runtime-boundary | state/logs/cache/tmp/locks 边界 | tracked shell；运行内容 ignored |
| `scripts/` | tooling | 构建、打包和验证脚本 | tracked |
| `server.mjs` | transport | HTTP/Web Server 入口 | tracked |
| `skills/` | compatibility | legacy Skill adapter | tracked；不拥有第二份 Prompt/Manual |
| `src/` | source | Domain/Application/Ports/Adapters/Composition | tracked |
| `styles.css` | presentation | Web 样式入口 | tracked |
| `tests/` | test | unit/contract/integration/e2e | tracked |
| `ui/` | presentation | Web UI 模块 | tracked |

`.git/` 是基础设施豁免；本地 `.DS_Store` 和未登记 `exports/` 只作为 cleanup finding 分类，不属于本表删除授权。

## 架构、OpenSpec 与验证证据

- 设计声明：本 README、`architecture/README.md`、项目 OpenSpec。
- Contract 事实：manifest、Action Catalog、payload Schema、状态 revision/lock 规则。
- 代码事实：`src/`、CLI、Server、Electron 和 UI 统一进入 dispatcher/Application。
- 运行事实：`npm run check`、`npm test`、OpenSpec validation 和根 selected conformance 的实际退出码。
- 当前状态必须按 Governance、Definition 与 Instance 分别报告；本章不自行宣称 conformant 或 online。

## 架构边界

```text
CLI / HTTP / Web UI / Provider
              ↓
EngineMessage + Action Validator / Dispatcher       Inbound Boundary
              ↓
PerchApplication / Aggregate / Domain Rules     Business Core
              ↓
JSON Repository / Lock / Inspector / Probe / EngineClient  Outbound Boundary
```

- Domain/Application 不依赖 HTTP、DOM、CLI、文件系统、`localStorage` 或具体网络客户端。
- Outbound Adapter 实现 Business Core 声明的窄 Port。
- 只有 `src/composition/create-perch-engine.mjs` 选择具体 Adapter。
- EngineMessage v1.0 信封从 Generic Engines 根治理目录读取，不在本工程复制或扩展。
- Desktop Composition Host 向 Perch 注入只允许四个 Launcher Action 的 EngineClient；普通 Server/CLI 未注入时，Launcher Action 返回 `DEPENDENCY_UNAVAILABLE`，其他 CRUD 不受影响。

架构权威：`../../openspec/architecture/generic-engine-runtime-architecture.md`。迁移 Change 保存在 `openspec/changes/convert-perch-application-to-engine/`。

## Action Catalog

| Action | 能力 |
|---|---|
| `engine.describe` | 描述 Engine、Transport 和 Action Contract |
| `system.health` | 返回生命周期和状态所有权健康检查 |
| `perch.snapshot.get` | 读取 Schema 2.0 aggregate、tags、paths、notes、projects 和 savedViews |
| `perch.tag.upsert` / `perch.tag.delete` | 维护跨三类记录共享的多标签 Registry |
| `perch.path.*` | 路径 CRUD、受限检查、批量预检/原子提交和保持 ID 的修复 |
| `perch.note.upsert` / `perch.note.delete` | 速记新增、编辑、置顶和删除 |
| `perch.project.upsert` / `perch.project.delete` | 项目入口目录维护；旧 command 字段仍是惰性数据 |
| `perch.project.probe` | 仅探测已登记项目的 loopback HTTP(S) endpoint |
| `perch.project.launch.*` | 配置、启动、停止和读取独立 Project Launcher owned runtime |
| `perch.entry.usage.record` | 记录成功复制、Finder 打开、查看和启动事件 |
| `perch.view.*` | 保存当前查询、标签、路径状态与排序视图 |
| `perch.backup.export` / `perch.backup.import` | 导出 version 2；支持 dry-run 原子导入并兼容 1.x |

所有 Action request/success Schema 位于 `contracts/actions/`，运行时校验和契约测试读取同一文件。写 Action 使用 `expectedRevision`；过期写入返回 `PERCH_REVISION_CONFLICT`。

## Consumer surfaces

Perch 使用 manifest 1.2 显式发布三类已有入口：人类从 `README.md` / `architecture/README.md` 理解职责；程序通过 EngineMessage 1.0 调用 Action Catalog 的完整 Action 集合；Agent 使用 canonical `operate-perch` 与 `register-project-entry` Skills。旧 `skills/register-project-entry/SKILL.md` 只作为 compatibility path，不是第二个 Skill。

`engine.describe` 返回上述声明的 schema-safe 投影；Skill compatibility path 不进入 describe success payload。consumer declaration 只描述可发现入口，不证明 Runtime Definition 已持久登记或 Instance online。

路径、速记和项目统一通过 `tagIds` 引用共享 Tag Registry。标签名称和颜色只保存一份；1.x `groups/groupId/groupColor` 会在 Repository load 边界原子迁移，并保留迁移前 revision backup。

## 状态所有权

Perch 是 `single-writer` 有状态 Engine。状态根由 `PERCH_RUNTIME_DIR` 控制，包含：

```text
perch-state.json
.perch-owner.lock
backups/revision-XXXXXXXX.json
```

状态 Schema 为 `2.0`，aggregate 包含共享 `tags`、三类记录、`savedViews`、路径/项目 inspection 和每条记录的 usage。提交执行完整校验、同目录临时写入、文件 fsync、上一 revision 备份和原子 rename。损坏 JSON、未知 Schema 或不满足不变量的状态返回 `PERCH_STATE_CORRUPT`，不会被默认值覆盖。

- Server 是正常运行时的唯一写入者。
- CLI 配置 `--server-url` 或 `PERCH_SERVER_URL` 时只作为 HTTP Client，不访问本地状态。
- Standalone CLI 必须显式提供绝对 `PERCH_RUNTIME_DIR` 并取得独占锁；根 conformance 只使用 manifest 声明的临时 `RUNTIME_DATA_DIR` fallback。
- 第二个写入者返回 `STATE_OWNERSHIP_CONFLICT`，不会静默 fallback。
- 未配置运行目录的 Server 默认使用 `~/.local/share/perch-engine`；测试与 conformance 始终使用临时目录。
- 项目内 `runtime_data/` 只是边界说明，不能提交用户数据、锁或备份。

## 启动 Server 与 Web UI

```bash
PERCH_RUNTIME_DIR=/absolute/path/to/perch-runtime npm start
```

默认绑定 `127.0.0.1:4173`。可使用 `PERCH_HOST`（只允许 loopback）和 `PERCH_PORT` 调整。Web UI 访问 <http://127.0.0.1:4173>，所有业务读写均发送完整 EngineMessage 到 `POST /engine-message`。

UI 保留紧凑 key-value 路径/速记列表、项目入口、搜索、过滤、复制、置顶、拖放和 200ms 图标说明动画。速记与文件路径一样可按共享 TAG 分组过滤、从当前页进入完整 TAG Registry，并基于 Engine-owned usage 显示最近/常用入口；复制速记会记录 usage，点击入口可清除冲突筛选并定位原记录。Server 不可用或直接打开 `index.html` 时进入只读连接失败状态，不会把浏览器数据当成第二份业务真相。

Web UI 源码布局：

```text
app.js                 # ES Module 组合入口（theme / bind / loadSnapshot）
ui/
  state.js             # 客户端可变 state
  dom.js               # DOM refs、escapeHtml、icon、toast
  engine-client.js     # EngineMessage fetch、snapshot、连接状态
  render-*.js          # 列表渲染
  dialogs-*.js         # 编辑对话框与 TAG Registry
  drop-batch.js        # 拖放批量收录
  backup-legacy.js     # 导入导出与旧数据迁移
  desktop.js           # theme / 置顶 / Finder
  header-layout.js     # header 高度同步
  events.js            # 事件绑定
```

`index.html` 以 `type="module"` 加载 `app.js`；Server 额外放行 `/ui/*.js` 静态模块。不引入打包器。

## Electron Desktop Shell

已安装的日常入口：

```text
/Applications/Perch.app
```

可从 Finder“应用程序”、Spotlight 或 Launchpad 打开，也可以把 `Perch.app` 拖到 Dock。它不需要先运行 npm；没有现有 Server 时会自行启动 WorkPerch。

开发模式启动桌面窗口：

```bash
cd /Users/ugreen/workspace/generic_engines/engine_projects/engine-perch
npm run desktop
```

Desktop Shell 复用同一套 UI 和 `POST /engine-message`，并作为 Composition Host 分别启动 Perch 与 Project Launcher。为保证 Launcher 注入和双 runtime 所有权一致，Desktop 必须拥有 `127.0.0.1:4173` 的组合式 Server；若端口已被其他 Perch Server 占用，会明确失败而不是静默降级为无 Launcher 的连接。

窗口现在可以缩小到 `360 × 320`。Header 中的图钉按钮仅在 Desktop App 显示：点击后窗口进入全局置顶，使用 macOS floating 层级跨应用、Spaces 和全屏空间保持在最上方；再次点击立即取消。这个开关属于本地界面偏好，不会写入 WorkPerch 业务状态。

在 Electron 窗口中从 Finder 拖入文件或文件夹时，受限 preload bridge 使用 Electron `webUtils.getPathForFile` 取得真实绝对路径，因此 KEY 和 VALUE 都会自动填入。普通浏览器仍受浏览器安全限制：无法取得路径时只预填名称，并提示使用 Finder `⌥⌘C` 复制路径。

路径行和无 Web URL 的项目入口中的“打开”按钮只在 Desktop Host 中调用受限 Finder bridge：目录会在 Finder 中直接打开，文件会在 Finder 中定位并选中，不会执行文件或项目命令。普通浏览器点击时会明确提示使用 Perch 桌面应用，不再尝试无效的 `file://` 导航。

Desktop Renderer 保持 `nodeIntegration: false`、`contextIsolation: true`；preload 只暴露拖入 File 的路径解析、当前窗口置顶和固定 Finder 打开方法，不开放文件系统、命令执行、Launcher 或任意 IPC。项目启动仍通过 Web UI → Perch EngineMessage → 注入 EngineClient → Project Launcher EngineMessage 完成。

重新构建本机 arm64 App：

```bash
npm run desktop:pack
ditto dist/desktop/Perch-darwin-arm64/Perch.app /Applications/Perch.app
```

断网构建可把包含 `electron-v43.2.0-darwin-arm64.zip` 的目录通过 `ELECTRON_ZIP_DIR=/absolute/cache/dir` 显式传入，打包器将只使用该本地 ZIP。

构建使用 ASAR，排除 Git、测试、OpenSpec、runtime data、导出和 Agent Skill，并把正式 `governance/` Contract、Project Launcher 的 manifest/contracts/src，以及 Perch/Launcher 共享 describe 投影所需的 Engine Provider SPI `package.json`、component manifest 与 `src/` 作为最小只读资源放入 App。Launcher 与 SPI 的 tests、fixtures、OpenSpec 和 runtime_data 不进入安装包。生成物采用本机 ad-hoc 签名，适用于当前 Mac；跨机器公开分发需要 Developer ID 和 notarization。

工程内的本机安装镜像位于 `release/Perch-2.1.0-arm64.dmg`。打开 DMG 后，把 `Perch.app` 拖到其中的 `Applications` 快捷方式即可安装。该镜像不包含 Perch 或 Project Launcher runtime state、锁、备份或用户数据。

## CLI

Standalone Exclusive：

```bash
export PERCH_RUNTIME_DIR=/absolute/isolated/runtime
printf '%s\n' '{"protocol":"generic-engines/engine-message","version":"1.0","kind":"request","id":"demo","engine":"perch","action":"perch.snapshot.get","payload":{}}' | node cli.mjs
node cli.mjs --message-file request.json
```

Server Client：

```bash
node cli.mjs --server-url http://127.0.0.1:4173 --message-file request.json
# 或 export PERCH_SERVER_URL=http://127.0.0.1:4173
```

stdout 恰好输出一个 EngineMessage response；诊断只写 stderr。成功退出码为 0，协议、Transport、业务、状态和内部错误均为非零。

## Legacy localStorage 迁移

旧 Application 使用：

- `local-dashboard.paths.v1`
- `local-dashboard.notes.v1`
- `local-dashboard.theme.v1`

首次成功连接 Engine 后，UI 才检测旧 paths/notes，并显示数量要求明确确认。迁移构造 `perch-key-value-list` version 1，先调用 `perch.backup.import` 的 `dryRun=true, mode=merge`，确认摘要后再以当前 revision 原子提交。

只有 Engine 确认提交后才记录迁移标记；旧 paths/notes 不会自动删除。页面“旧数据”入口提供再次迁移与独立确认的手动清理，theme 始终保留。回滚到旧 Application 时，未手动清理的数据仍可继续读取。

普通备份导入同样必须显式选择 `merge` 或 `replace`，先 dry-run，再提交。任何非法元素都会拒绝完整导入，不产生部分写入。

## 供其他工程 Agent 使用的接入 Skill

其他工程需要加入 Perch“项目入口”时，使用：

```text
Use $register-project-entry to register the current project in WorkPerch and verify the saved entry.
```

Canonical Skill 位于 `.agents/skills/register-project-entry/SKILL.md`。它要求 Agent 读取自身工程事实，通过 `perch.snapshot.get` 获取 revision，再通过 `perch.project.upsert` 注册或更新，最后回读 snapshot 验证。Skill 明确禁止直接修改 Perch seed、状态文件、锁或执行项目 command。

旧 `skills/register-project-entry/SKILL.md` 保留为兼容入口，会先委托 canonical Skill，因此已有 Prompt 或绝对路径不会因迁移失效。操作 Perch 工程本身时使用 `.agents/skills/operate-perch/SKILL.md`，其中统一了 check/test、Server Client、Standalone Exclusive、临时 runtime 和根 conformance 流程。

如果希望直接把一份任务文件交给其他 Agent，可使用 `prompts/register-project-entry.prompt.md`；该 Prompt 已包含目标、Server 地址、执行边界和完成报告格式。

## 安全约束

- Perch 不使用 `child_process.exec`，不执行旧项目 command；Project Launcher 固定使用 `spawn(executable, args, { shell: false, cwd })`，拒绝 shell 解释器和命令字符串。
- Probe 只接受已登记项目，协议限 HTTP(S)，主机限 `127.0.0.1`、`localhost`、`::1`，超时 100–5000ms，并发上限 4，不跟随重定向。
- HTTP 请求体限制为 1 MiB，静态资源使用白名单并拒绝路径逃逸。
- Server/CLI 不记录完整路径、速记、备份或用户 payload。
- Perch 不读取或写入 Project Launcher 的运行目录、内部文件或数据库；跨 Engine 只传公开 EngineMessage。

## 验证

```bash
npm run check
npm test
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e
openspec validate --all --json
```

根治理验收从 Generic Engines 根目录运行：

```bash
npm test
npm run conformance
node conformance/runner.mjs --static-only
node conformance/runner.mjs --engine perch --json
```

若沙箱禁止本地监听，HTTP E2E 会明确以 `listen EPERM` 跳过；这属于环境限制，必须在允许 loopback listen 的环境补跑，不能据此宣称 HTTP 已通过。

## 回滚

停止 Perch Server，保留 `PERCH_RUNTIME_DIR` 中的 aggregate 与 revision 备份。恢复旧 UI 版本后，未手动清理的 legacy localStorage 仍可使用。回滚不需要修改其他 Engine 或删除 Engine 状态。

<!-- seshat:readme-consumer-entry:v1 -->
### Seshat 消费者接入与下一步（Quick Start）

#### 终端：安装、检查与验证

安装前，目标工程中的 Agent 无法自动发现尚未安装的 Seshat Skill。必须从可信 Provider checkout、PATH 中已发布的可信 `seshat` CLI、`SESHAT_PROVIDER_ROOT` 或显式 `--provider-root` 开始；源码 checkout 用 `node /绝对路径/seshat/bin/seshat.mjs`，已在 PATH 中时用 `seshat`：

```bash
node /绝对路径/seshat/bin/seshat.mjs bootstrap --target /绝对路径/工程 --provider-root /绝对路径/seshat --dry-run --json
node /绝对路径/seshat/bin/seshat.mjs bootstrap --target /绝对路径/工程 --provider-root /绝对路径/seshat --agent agents --profile full --delivery auto --json
node /绝对路径/seshat/bin/seshat.mjs assure --target /绝对路径/工程 --review --json
node /绝对路径/seshat/bin/seshat.mjs verify --target /绝对路径/工程 --json
```

#### Shared .agents skills 对话：安装完成后

也可以直接用自然语言告诉 Agent：

- 检查当前工程是否已经正确接入 Seshat。
- 审查当前 README 是否足以让新开发者和 AI 开始工作。
- 审查所有 Skill 的跨 Agent 发现和触发条件。
- 整改这个工程自己拥有的不合格 Skill。
- 升级 Seshat Skill Kit，并保留本地自定义内容。
- 运行完整治理收敛并告诉我还有哪些 Owner 决策。

终端命令由 CLI 执行；以上句子和 Skill 调用写在 Agent chat 中。当前限制：安装或静态检查通过不等于当前 Agent 已实际加载 Skill，也不证明自然语言自动触发已经通过 forward evaluation；按 Registry 的 setup/restart 提示刷新或开启新会话。

#### 更新、brownfield 与安全移除

```bash
node /绝对路径/seshat/bin/seshat.mjs upgrade --target /绝对路径/工程 --provider-root /绝对路径/seshat --dry-run --json
node /绝对路径/seshat/bin/seshat.mjs uninstall --target /绝对路径/工程 --agent agents --dry-run --json
```

存量工程不需要先人工重建目录：先 discover/review，再只应用无歧义的机械整改。upgrade 和 uninstall 只处理 receipt 仍能证明未被本地修改的 managed 文件；分歧文件、未知目录、源码、Runtime、凭据与用户数据保持原位。

文档与 Authority 路由：人从 `README.md` 进入，AI 再读 `AGENTS.md`，程序使用 `seshat commands list --json`、`seshat agents list --json` 和 `seshat skills list --json`，运维从 README、CLI 帮助和审计/验证结果确认治理状态，稳定规格与 Contract 位于 `openspec/specs/`。配置、安装、升级与排错见项目 `docs/`；框架问题通过项目声明的反馈入口提交。
<!-- /seshat:readme-consumer-entry:v1 -->
