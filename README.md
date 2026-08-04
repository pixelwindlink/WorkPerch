# Dashboard Engine

Dashboard Engine 2.0（Engine ID：`dashboard`）通过 EngineMessage 管理本地开发工作区的文件路径、速记和项目入口目录，并提供路径状态感知、共享多标签、使用排序、保存视图、版本化备份，以及通过独立 Project Launcher Engine 实现的安全项目启动/停止。

它不是 Generic Engines Runtime、Message Router、Observability Plane、Shell 执行器、文件管理器、凭据管理器或其他 Engine 的状态/健康权威。Dashboard 自身不执行项目命令；Desktop 只把结构化 `cwd + executable + args[]` 经注入 EngineClient 发送给独立 `project-launcher`。

## 架构边界

```text
CLI / HTTP / Web UI / Provider
              ↓
EngineMessage + Action Validator / Dispatcher       Inbound Boundary
              ↓
DashboardApplication / Aggregate / Domain Rules     Business Core
              ↓
JSON Repository / Lock / Inspector / Probe / EngineClient  Outbound Boundary
```

- Domain/Application 不依赖 HTTP、DOM、CLI、文件系统、`localStorage` 或具体网络客户端。
- Outbound Adapter 实现 Business Core 声明的窄 Port。
- 只有 `src/composition/create-dashboard-engine.mjs` 选择具体 Adapter。
- EngineMessage v1.0 信封从 Generic Engines 根治理目录读取，不在本工程复制或扩展。
- Desktop Composition Host 向 Dashboard 注入只允许四个 Launcher Action 的 EngineClient；普通 Server/CLI 未注入时，Launcher Action 返回 `DEPENDENCY_UNAVAILABLE`，其他 CRUD 不受影响。

架构权威：`../../openspec/changes/define-generic-engine-runtime-architecture/design.md`。迁移 Change 保存在 `openspec/changes/convert-dashboard-application-to-engine/`。

## Action Catalog

| Action | 能力 |
|---|---|
| `engine.describe` | 描述 Engine、Transport 和 Action Contract |
| `system.health` | 返回生命周期和状态所有权健康检查 |
| `dashboard.snapshot.get` | 读取 Schema 2.0 aggregate、tags、paths、notes、projects 和 savedViews |
| `dashboard.tag.upsert` / `dashboard.tag.delete` | 维护跨三类记录共享的多标签 Registry |
| `dashboard.path.*` | 路径 CRUD、受限检查、批量预检/原子提交和保持 ID 的修复 |
| `dashboard.note.upsert` / `dashboard.note.delete` | 速记新增、编辑、置顶和删除 |
| `dashboard.project.upsert` / `dashboard.project.delete` | 项目入口目录维护；旧 command 字段仍是惰性数据 |
| `dashboard.project.probe` | 仅探测已登记项目的 loopback HTTP(S) endpoint |
| `dashboard.project.launch.*` | 配置、启动、停止和读取独立 Project Launcher owned runtime |
| `dashboard.entry.usage.record` | 记录成功复制、Finder 打开、查看和启动事件 |
| `dashboard.view.*` | 保存当前查询、标签、路径状态与排序视图 |
| `dashboard.backup.export` / `dashboard.backup.import` | 导出 version 2；支持 dry-run 原子导入并兼容 1.x |

所有 Action request/success Schema 位于 `contracts/actions/`，运行时校验和契约测试读取同一文件。写 Action 使用 `expectedRevision`；过期写入返回 `DASHBOARD_REVISION_CONFLICT`。

## Consumer surfaces

Dashboard 使用 manifest 1.2 显式发布三类已有入口：人类从 `README.md` / `architecture/README.md` 理解职责；程序通过 EngineMessage 1.0 调用 Action Catalog 的完整 Action 集合；Agent 使用 canonical `operate-dashboard` 与 `register-project-entry` Skills。旧 `skills/register-project-entry/SKILL.md` 只作为 compatibility path，不是第二个 Skill。

`engine.describe` 返回上述声明的 schema-safe 投影；Skill compatibility path 不进入 describe success payload。consumer declaration 只描述可发现入口，不证明 Runtime Definition 已持久登记或 Instance online。

路径、速记和项目统一通过 `tagIds` 引用共享 Tag Registry。标签名称和颜色只保存一份；1.x `groups/groupId/groupColor` 会在 Repository load 边界原子迁移，并保留迁移前 revision backup。

## 状态所有权

Dashboard 是 `single-writer` 有状态 Engine。状态根由 `DASHBOARD_RUNTIME_DIR` 控制，包含：

```text
dashboard-state.json
.dashboard-owner.lock
backups/revision-XXXXXXXX.json
```

状态 Schema 为 `2.0`，aggregate 包含共享 `tags`、三类记录、`savedViews`、路径/项目 inspection 和每条记录的 usage。提交执行完整校验、同目录临时写入、文件 fsync、上一 revision 备份和原子 rename。损坏 JSON、未知 Schema 或不满足不变量的状态返回 `DASHBOARD_STATE_CORRUPT`，不会被默认值覆盖。

- Server 是正常运行时的唯一写入者。
- CLI 配置 `--server-url` 或 `DASHBOARD_SERVER_URL` 时只作为 HTTP Client，不访问本地状态。
- Standalone CLI 必须显式提供绝对 `DASHBOARD_RUNTIME_DIR` 并取得独占锁；根 conformance 只使用 manifest 声明的临时 `RUNTIME_DATA_DIR` fallback。
- 第二个写入者返回 `STATE_OWNERSHIP_CONFLICT`，不会静默 fallback。
- 未配置运行目录的 Server 默认使用 `~/.local/share/dashboard-engine`；测试与 conformance 始终使用临时目录。
- 项目内 `runtime_data/` 只是边界说明，不能提交用户数据、锁或备份。

## 启动 Server 与 Web UI

```bash
cd /Users/ugreen/workspace/generic_engines/engine_projects/dashboard
DASHBOARD_RUNTIME_DIR=/absolute/path/to/dashboard-runtime npm start
```

默认绑定 `127.0.0.1:4173`。可使用 `DASHBOARD_HOST`（只允许 loopback）和 `DASHBOARD_PORT` 调整。Web UI 访问 <http://127.0.0.1:4173>，所有业务读写均发送完整 EngineMessage 到 `POST /engine-message`。

UI 保留紧凑 key-value 路径/速记列表、项目入口、搜索、过滤、复制、置顶、拖放和 200ms 图标说明动画。Server 不可用或直接打开 `index.html` 时进入只读连接失败状态，不会把浏览器数据当成第二份业务真相。

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
/Applications/Dashboard.app
```

可从 Finder“应用程序”、Spotlight 或 Launchpad 打开，也可以把 `Dashboard.app` 拖到 Dock。它不需要先运行 npm；没有现有 Server 时会自行启动 Dashboard Engine。

开发模式启动桌面窗口：

```bash
cd /Users/ugreen/workspace/generic_engines/engine_projects/dashboard
npm run desktop
```

Desktop Shell 复用同一套 UI 和 `POST /engine-message`，并作为 Composition Host 分别启动 Dashboard 与 Project Launcher。为保证 Launcher 注入和双 runtime 所有权一致，Desktop 必须拥有 `127.0.0.1:4173` 的组合式 Server；若端口已被其他 Dashboard Server 占用，会明确失败而不是静默降级为无 Launcher 的连接。

窗口现在可以缩小到 `360 × 320`。Header 中的图钉按钮仅在 Desktop App 显示：点击后窗口进入全局置顶，使用 macOS floating 层级跨应用、Spaces 和全屏空间保持在最上方；再次点击立即取消。这个开关属于本地界面偏好，不会写入 Dashboard Engine 业务状态。

在 Electron 窗口中从 Finder 拖入文件或文件夹时，受限 preload bridge 使用 Electron `webUtils.getPathForFile` 取得真实绝对路径，因此 KEY 和 VALUE 都会自动填入。普通浏览器仍受浏览器安全限制：无法取得路径时只预填名称，并提示使用 Finder `⌥⌘C` 复制路径。

路径行和无 Web URL 的项目入口中的“打开”按钮只在 Desktop Host 中调用受限 Finder bridge：目录会在 Finder 中直接打开，文件会在 Finder 中定位并选中，不会执行文件或项目命令。普通浏览器点击时会明确提示使用 Dashboard 桌面应用，不再尝试无效的 `file://` 导航。

Desktop Renderer 保持 `nodeIntegration: false`、`contextIsolation: true`；preload 只暴露拖入 File 的路径解析、当前窗口置顶和固定 Finder 打开方法，不开放文件系统、命令执行、Launcher 或任意 IPC。项目启动仍通过 Web UI → Dashboard EngineMessage → 注入 EngineClient → Project Launcher EngineMessage 完成。

重新构建本机 arm64 App：

```bash
npm run desktop:pack
ditto dist/desktop/Dashboard-darwin-arm64/Dashboard.app /Applications/Dashboard.app
```

断网构建可把包含 `electron-v43.2.0-darwin-arm64.zip` 的目录通过 `ELECTRON_ZIP_DIR=/absolute/cache/dir` 显式传入，打包器将只使用该本地 ZIP。

构建使用 ASAR，排除 Git、测试、OpenSpec、runtime data、导出和 Agent Skill，并把正式 `governance/` Contract 与 Project Launcher 的 manifest/contracts/src 作为两个只读资源放入 App。Launcher tests、OpenSpec 和 runtime_data 不进入安装包。生成物采用本机 ad-hoc 签名，适用于当前 Mac；跨机器公开分发需要 Developer ID 和 notarization。

工程内的本机安装镜像位于 `release/Dashboard-2.1.0-arm64.dmg`。打开 DMG 后，把 `Dashboard.app` 拖到其中的 `Applications` 快捷方式即可安装。该镜像不包含 Dashboard 或 Project Launcher runtime state、锁、备份或用户数据。

## CLI

Standalone Exclusive：

```bash
export DASHBOARD_RUNTIME_DIR=/absolute/isolated/runtime
printf '%s\n' '{"protocol":"generic-engines/engine-message","version":"1.0","kind":"request","id":"demo","engine":"dashboard","action":"dashboard.snapshot.get","payload":{}}' | node cli.mjs
node cli.mjs --message-file request.json
```

Server Client：

```bash
node cli.mjs --server-url http://127.0.0.1:4173 --message-file request.json
# 或 export DASHBOARD_SERVER_URL=http://127.0.0.1:4173
```

stdout 恰好输出一个 EngineMessage response；诊断只写 stderr。成功退出码为 0，协议、Transport、业务、状态和内部错误均为非零。

## Legacy localStorage 迁移

旧 Application 使用：

- `local-dashboard.paths.v1`
- `local-dashboard.notes.v1`
- `local-dashboard.theme.v1`

首次成功连接 Engine 后，UI 才检测旧 paths/notes，并显示数量要求明确确认。迁移构造 `dashboard-key-value-list` version 1，先调用 `dashboard.backup.import` 的 `dryRun=true, mode=merge`，确认摘要后再以当前 revision 原子提交。

只有 Engine 确认提交后才记录迁移标记；旧 paths/notes 不会自动删除。页面“旧数据”入口提供再次迁移与独立确认的手动清理，theme 始终保留。回滚到旧 Application 时，未手动清理的数据仍可继续读取。

普通备份导入同样必须显式选择 `merge` 或 `replace`，先 dry-run，再提交。任何非法元素都会拒绝完整导入，不产生部分写入。

## 供其他工程 Agent 使用的接入 Skill

其他工程需要加入 Dashboard“项目入口”时，使用：

```text
Use $register-project-entry to register the current project in Dashboard Engine and verify the saved entry.
```

Canonical Skill 位于 `.agents/skills/register-project-entry/SKILL.md`。它要求 Agent 读取自身工程事实，通过 `dashboard.snapshot.get` 获取 revision，再通过 `dashboard.project.upsert` 注册或更新，最后回读 snapshot 验证。Skill 明确禁止直接修改 Dashboard seed、状态文件、锁或执行项目 command。

旧 `skills/register-project-entry/SKILL.md` 保留为兼容入口，会先委托 canonical Skill，因此已有 Prompt 或绝对路径不会因迁移失效。操作 Dashboard 工程本身时使用 `.agents/skills/operate-dashboard/SKILL.md`，其中统一了 check/test、Server Client、Standalone Exclusive、临时 runtime 和根 conformance 流程。

如果希望直接把一份任务文件交给其他 Agent，可使用 `prompts/register-project-entry.prompt.md`；该 Prompt 已包含目标、Server 地址、执行边界和完成报告格式。

## 安全约束

- Dashboard 不使用 `child_process.exec`，不执行旧项目 command；Project Launcher 固定使用 `spawn(executable, args, { shell: false, cwd })`，拒绝 shell 解释器和命令字符串。
- Probe 只接受已登记项目，协议限 HTTP(S)，主机限 `127.0.0.1`、`localhost`、`::1`，超时 100–5000ms，并发上限 4，不跟随重定向。
- HTTP 请求体限制为 1 MiB，静态资源使用白名单并拒绝路径逃逸。
- Server/CLI 不记录完整路径、速记、备份或用户 payload。
- Dashboard 不读取或写入 Project Launcher 的运行目录、内部文件或数据库；跨 Engine 只传公开 EngineMessage。

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
node conformance/runner.mjs --engine dashboard --json
```

若沙箱禁止本地监听，HTTP E2E 会明确以 `listen EPERM` 跳过；这属于环境限制，必须在允许 loopback listen 的环境补跑，不能据此宣称 HTTP 已通过。

## 回滚

停止 Dashboard Server，保留 `DASHBOARD_RUNTIME_DIR` 中的 aggregate 与 revision 备份。恢复旧 UI 版本后，未手动清理的 legacy localStorage 仍可使用。回滚不需要修改其他 Engine 或删除 Engine 状态。
