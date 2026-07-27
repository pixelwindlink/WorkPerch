# Dashboard Engine

Dashboard Engine（Engine ID：`dashboard`）通过 EngineMessage 管理本地开发工作区的文件路径、速记和项目入口目录，并提供查询、修改、版本化备份、恢复和受限 loopback endpoint liveness 探测。

它不是 Generic Engines Runtime、Message Router、Observability Plane、Shell 执行器、文件管理器、凭据管理器或其他 Engine 的状态/健康权威。项目启动命令只是可显示和复制的字符串，Server 不会执行它们。

## 架构边界

```text
CLI / HTTP / Web UI / Provider
              ↓
EngineMessage + Action Validator / Dispatcher       Inbound Boundary
              ↓
DashboardApplication / Aggregate / Domain Rules     Business Core
              ↓
JSON Repository / Lock / Clock / ID / Seed / Probe  Outbound Boundary
```

- Domain/Application 不依赖 HTTP、DOM、CLI、文件系统、`localStorage` 或具体网络客户端。
- Outbound Adapter 实现 Business Core 声明的窄 Port。
- 只有 `src/composition/create-dashboard-engine.mjs` 选择具体 Adapter。
- EngineMessage v1.0 信封从 Generic Engines 根治理目录读取，不在本工程复制或扩展。
- 当前没有真实跨 Engine 调用，因此 manifest 将 EngineClient 声明为 `not-required`。

架构权威：`../../openspec/changes/define-generic-engine-runtime-architecture/design.md`。迁移 Change 保存在 `openspec/changes/convert-dashboard-application-to-engine/`。

## Action Catalog

| Action | 能力 |
|---|---|
| `engine.describe` | 描述 Engine、Transport 和 Action Contract |
| `system.health` | 返回生命周期和状态所有权健康检查 |
| `dashboard.snapshot.get` | 读取 aggregate revision 与 groups/paths/notes/projects |
| `dashboard.group.upsert` / `dashboard.group.delete` | 统一维护共享 GROUP 名称和颜色；仅允许删除未使用 GROUP |
| `dashboard.path.upsert` / `dashboard.path.delete` | 路径新增、编辑、置顶和删除 |
| `dashboard.note.upsert` / `dashboard.note.delete` | 速记新增、编辑、置顶和删除 |
| `dashboard.project.upsert` / `dashboard.project.delete` | 项目入口目录维护；command 永远是惰性数据 |
| `dashboard.project.probe` | 仅探测已登记项目的 loopback HTTP(S) endpoint |
| `dashboard.backup.export` | 导出 `dashboard-engine-backup` version 1 |
| `dashboard.backup.import` | `merge` / `replace`、`dryRun` 和原子提交；兼容 legacy version 1 |

所有 Action request/success Schema 位于 `contracts/actions/`，运行时校验和契约测试读取同一文件。写 Action 使用 `expectedRevision`；过期写入返回 `DASHBOARD_REVISION_CONFLICT`。

文件路径通过 `groupId` 引用独立 GROUP Registry。GROUP 的名称和颜色只保存一份，Registry 或任一路径编辑弹窗修改共享颜色后，所有引用该 GROUP 的路径会统一显示；旧 path-level `groupColor` 仅用于迁移。

## 状态所有权

Dashboard 是 `single-writer` 有状态 Engine。状态根由 `DASHBOARD_RUNTIME_DIR` 控制，包含：

```text
dashboard-state.json
.dashboard-owner.lock
backups/revision-XXXXXXXX.json
```

状态 Schema 为 `1.0`，aggregate 包含 `schemaVersion`、`aggregateRevision`、`paths`、`notes`、`projects`、`createdAt` 和 `updatedAt`。提交执行完整校验、同目录临时写入、文件 fsync、上一 revision 备份和原子 rename。损坏 JSON、未知 Schema 或不满足不变量的状态返回 `DASHBOARD_STATE_CORRUPT`，不会被默认值覆盖。

- Server 是正常运行时的唯一写入者。
- CLI 配置 `--server-url` 或 `DASHBOARD_SERVER_URL` 时只作为 HTTP Client，不访问本地状态。
- Standalone CLI 必须显式提供绝对 `DASHBOARD_RUNTIME_DIR` 并取得独占锁。
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

Desktop Shell 复用同一套 UI 和 `POST /engine-message`。如果 `127.0.0.1:4173` 已经运行 Dashboard Server，它只连接现有 Server；否则由 Desktop 进程启动并拥有 Server，退出时仅停止自己创建的实例。

窗口现在可以缩小到 `360 × 320`。Header 中的图钉按钮仅在 Desktop App 显示：点击后窗口进入全局置顶，使用 macOS floating 层级跨应用、Spaces 和全屏空间保持在最上方；再次点击立即取消。这个开关属于本地界面偏好，不会写入 Dashboard Engine 业务状态。

在 Electron 窗口中从 Finder 拖入文件或文件夹时，受限 preload bridge 使用 Electron `webUtils.getPathForFile` 取得真实绝对路径，因此 KEY 和 VALUE 都会自动填入。普通浏览器仍受浏览器安全限制：无法取得路径时只预填名称，并提示使用 Finder `⌥⌘C` 复制路径。

Desktop Renderer 保持 `nodeIntegration: false`、`contextIsolation: true`；preload 只暴露拖入 File 的路径解析，不开放文件系统、命令执行或任意 IPC。

重新构建本机 arm64 App：

```bash
npm run desktop:pack
ditto dist/desktop/Dashboard-darwin-arm64/Dashboard.app /Applications/Dashboard.app
```

构建使用 ASAR，排除 Git、测试、OpenSpec、runtime data、导出和 Agent Skill，并把正式 `governance/` Contract 作为只读资源放入 App。生成物采用本机 ad-hoc 签名，适用于当前 Mac；跨机器公开分发需要 Developer ID 和 notarization。

工程内的本机安装镜像位于 `release/Dashboard-1.2.0-arm64.dmg`。打开 DMG 后，把 `Dashboard.app` 拖到其中的 `Applications` 快捷方式即可安装。该镜像不包含 Dashboard runtime state、锁、备份或用户数据。

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

- 不使用 `child_process.exec`，不执行项目 command。
- Probe 只接受已登记项目，协议限 HTTP(S)，主机限 `127.0.0.1`、`localhost`、`::1`，超时 100–5000ms，并发上限 4，不跟随重定向。
- HTTP 请求体限制为 1 MiB，静态资源使用白名单并拒绝路径逃逸。
- Server/CLI 不记录完整路径、速记、备份或用户 payload。
- 不读取或写入其他 Engine 的运行目录、内部文件或数据库。

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
