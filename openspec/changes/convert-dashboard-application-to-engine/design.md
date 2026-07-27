## Context

Dashboard 当前由一个静态 Node HTTP Server、单页 Web UI 和浏览器 `localStorage` 组成。浏览器同时承担状态仓储、ID/时间生成、导入校验、路径去重、项目 seed 和 endpoint 探测；因此没有独立业务边界、单一状态所有者、EngineMessage Action、CLI 或可被根 conformance 验证的公开 Engine Contract。

本 Change 将 Dashboard 转换为有状态 Engine，但保留现有高密度视觉和三个工作区。唯一架构设计权威是 `openspec/changes/define-generic-engine-runtime-architecture/design.md`。EngineMessage v1.0 核心 Schema 继续由 Generic Engines 根治理目录唯一拥有，Dashboard 只引用和读取它，不复制或添加 metadata、correlation、causation、event 等字段。

当前证据分级：

- 设计声明：现有 README/AGENT 声明 Dashboard 是 Application，状态属于浏览器。
- 代码事实：`app.js` 直接修改 `localStorage`、硬编码 `PROJECTS`、直接探测 endpoint；`server.mjs` 只托管静态文件。
- 运行事实：迁移前 `npm run check` 退出 0；根 `npm test` 为 9/9 通过。Dashboard 尚无 Engine 测试或黑盒协议证据。

### 差距处置

| 当前资产 | 处置 | 目标 |
|---|---|---|
| 高密度 UI、路径/项目/速记工作区、搜索复制置顶拖放 | 保留 | 作为 Web Inbound Adapter |
| 静态 HTTP Server | 适配 | 静态 Host + `POST /engine-message` Adapter |
| 浏览器 UI 业务操作 | 拆分 | UI 收集输入；Application/Domain 执行业务规则 |
| `localStorage` paths/notes | 替换 | Engine-owned JSON aggregate；localStorage 仅保留 legacy 和 theme |
| `PROJECTS` 常量 | 替换 | 首次初始化 seed + Engine project state |
| 浏览器 fetch 端口 | 替换 | 受限 loopback EndpointProbe Adapter |
| 浏览器导入校验 | 替换 | `dashboard.backup.import` dry-run/commit Use Case |
| 直接双击 HTML 完整写入 | 淘汰 | Server 不可用时只读连接失败/迁移提示 |

## Goals / Non-Goals

**Goals:**

- 提供稳定 Engine ID `dashboard`、manifest 1.1、Provider/SPI 和完整生命周期。
- 形成 Inbound Boundary → Business Core → Outbound Boundary 三层，只有 Composition Root 认识具体 Adapter。
- 通过一个 Action Catalog 和 payload Schema 驱动运行时校验、文档与契约测试。
- 让 CLI、HTTP、in-process 和 Web UI 进入同一个 dispatcher/use-case。
- 让 Server 成为正常运行时唯一写入者；Standalone CLI 只在显式隔离/独占运行目录中写入。
- 使用版本化 aggregate、独占锁、原子写入和 expectedRevision 保证状态一致性。
- 保留 legacy backup version 1 和 localStorage 用户数据，并提供显式确认式迁移。
- 受限探测已登记项目的 loopback endpoint，不执行任何项目命令。
- 通过 Dashboard 自有测试、OpenSpec 验证和根黑盒 conformance 后再决定注册状态。

**Non-Goals:**

- 不实现 Generic Engines Runtime、Router、Observability Plane 或跨 Engine 流量监控。
- 不读取或写入其他 Engine 的数据库、运行目录或内部文件。
- 不提供 shell、脚本、启动命令或文件操作执行能力；不引入 `child_process.exec` 或等价能力。
- 不引入远程主机扫描、凭据管理、文件管理器或通用 Service Locator。
- 不虚构 EngineClient 依赖；Dashboard 当前声明 `not-required`。
- 不修改 EngineMessage v1.0，不自动归档本 Change，不创建 Git commit。

## Decisions

### 1. 使用 manifest 1.1 和 Provider-compatible 边界

`engine.manifest.json` 使用当前 admission Contract 1.1，声明 `standalone`、`in-process`、`local-process` host mode，EngineClient `not-required`，以及 Control/Data/Observability 三平面接入。`DashboardEngineProvider` 暴露 manifest、Action Catalog、factory 和 start/readiness/health/quiesce/shutdown。

Provider 创建的 Engine 只公开 Transport-neutral `handle(message)` 和生命周期；Runtime Host 或 standalone Composition Root 注入 Repository、Lock、Clock、ID、Probe 和 Schema 位置。

替代方案是让 Server/CLI 直接实例化业务 Service。该方案缺失公开 hosting boundary，无法证明 hosted/standalone 一致性，因此不采用。

### 2. 三层采用明确模块依赖

```text
CLI / HTTP / Web UI / Provider
        ↓
Envelope Validator → Action Validator → Dispatcher
        ↓
Dashboard Application Use Cases
        ↓
Domain aggregate rules + engine-owned Ports
        ↑
JSON Repository / State Lock / Clock / ID / Endpoint Probe
```

- Inbound 只解析 Transport、校验 Schema、路由 Action 和映射错误。
- Application 负责事务边界、revision 检查、Repository load/save 和 Probe 编排。
- Domain 负责 Path/Note/Project 不变量、规范化、upsert/delete、merge/replace 和备份语义。
- Outbound Adapter 实现 Business Core 声明的小 Port。
- Composition Root 选择 Adapter；Domain/Application 不 import Adapter。

### 3. 核心信封只读取根正式 Schema

Dashboard 不复制 EngineMessage v1.0 envelope。Composition Root 通过注入路径加载：

1. `GENERIC_ENGINES_ENVELOPE_SCHEMA` 显式文件；或
2. `GENERIC_ENGINES_ROOT/governance/protocol/engine-message/v1.0/envelope.schema.json`；或
3. 当前已接入目录结构下可验证的根相对位置。

标准 Action Schema 同样读取根 `governance/protocol/actions/system/`，Dashboard Action Schema 读取本工程 `contracts/actions/`。若正式 Schema 不可用，Provider readiness/health 表达 not-ready，而不是使用一套私有信封规则继续运行。

边界使用一个零生产依赖 JSON Schema 2020-12 子集 Validator Adapter，支持当前正式 Schema 实际使用的 `type`、`const`、`enum`、`required`、`properties`、`additionalProperties`、`items`、`oneOf`、`anyOf`、长度/数量、pattern 和数值边界；发现不支持关键字时失败。Domain 不依赖该 Validator。

选择标准库实现是因为当前工程与根 conformance 都以零依赖为目标，现有 Schema 不需要完整通用 JSON Schema 引擎。若未来 Contract 使用更复杂关键字，再通过独立 Change 引入成熟 Validator Adapter。

### 4. Action Catalog 是 Dashboard 能力唯一事实来源

Catalog 包含 `engine.describe`、`system.health` 和下列 Dashboard Action：snapshot、path CRUD、note CRUD、project CRUD、project probe、backup export/import。每个 request/success payload 都有独立 2020-12 Schema，`additionalProperties: false`，运行时与测试加载同一文件。

Dispatcher 的确定顺序为：request envelope → Engine ID → Action lookup → request payload → use case → success payload → response envelope。任何失败都映射成合法 EngineMessage error；Dispatcher 不包含 merge、去重、revision 或 probe policy 业务规则。

### 5. 状态使用单文件 versioned aggregate

业务状态文件 `dashboard-state.json`：

```json
{
  "schemaVersion": "1.0",
  "aggregateRevision": 0,
  "paths": [],
  "notes": [],
  "projects": [],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Revision 是非负整数，每次实际写入递增一次。写入流程：完整 Domain 校验 → 写同目录临时文件 → fsync 文件 → 把旧状态复制到 `backups/revision-<n>.json` → 原子 rename → 尽力 fsync 目录。导入先在内存生成完整候选 aggregate，校验成功后只提交一次，不产生部分写入。

损坏 JSON、未知 schemaVersion 或非法 aggregate 返回 `DASHBOARD_STATE_CORRUPT`，不会静默初始化覆盖。新目录才创建初始状态。

### 6. single-writer 锁由状态根拥有

`StateOwnershipLock` 使用状态根中的独占 lock 文件和 `open(..., "wx")`。锁记录 PID、host、ownerMode 和 acquiredAt；同主机死 PID 可作为 stale lock 清理，存活或不可确认的 owner 返回 `STATE_OWNERSHIP_CONFLICT`。

- Server 启动时取得锁并持续持有，shutdown 时释放。
- CLI 配置 `DASHBOARD_SERVER_URL`/`--server-url` 时仅作为 HTTP client，不触碰状态文件。
- Standalone CLI 只在显式绝对 `DASHBOARD_RUNTIME_DIR` 下创建 Engine 并取得锁；无配置时不静默 fallback。
- conformance/test 始终提供临时 `DASHBOARD_RUNTIME_DIR`。

### 7. 运行目录与 source/user data 分离

`DASHBOARD_RUNTIME_DIR` 是权威配置。Server 在未提供时使用用户数据目录下的可预测默认位置，而不是工程源码目录；CLI Standalone 要求显式目录。项目内 `runtime_data/` 只保留说明和 ignore 边界，不作为测试或提交数据来源。

默认 project seed 由 Outbound Seed Adapter 在空状态首次创建时注入。Seed 使用相对工程关系和 `GENERIC_ENGINES_ROOT` 展开，不把 `/Users/ugreen/...` 写成领域规则；状态创建后源码 seed 不再是权威。

### 8. 乐观并发在所有写 Action 生效

路径、速记、项目和 backup import 写请求携带 `expectedRevision`。Application load 后比较当前 revision；不一致返回 `DASHBOARD_REVISION_CONFLICT`，不写文件。Web UI 收到冲突后显示提示并重新获取 snapshot，不在客户端自行合并。

Path 使用规范化绝对路径判重；创建重复 path 返回 `DASHBOARD_PATH_ALREADY_EXISTS`。编辑同 ID 可以保持原路径。Note/Project 以 ID 标识；ID 缺失时由 ID Port 生成。

### 9. Probe 是受限 Outbound Adapter

`dashboard.project.probe` 只接收已登记 project ID。Application 从当前 aggregate 取得 endpoint，Adapter 只允许 `http:`/`https:` 且 hostname 为 `127.0.0.1`、`localhost` 或 `::1`。请求有 100–5000ms timeout、最多 4 个并发，响应只表达 launcher endpoint online/offline/invalid；它不冒充目标 Engine 的 `system.health`。

不读取项目目录、不执行 run 命令、不跟随到非 loopback redirect、不探测请求中临时提供的任意 URL。

### 10. HTTP 和 CLI 共享同一 Engine 实例边界

- HTTP：`POST /engine-message` 接收完整请求，限制 1 MiB；业务成功/错误均返回完整 response。无效 JSON 与超限属于 Transport 失败，但仍返回安全的协议形状。静态资源采用白名单/根内解析，拒绝 traversal。
- CLI：stdin 或 `--message-file` 读取一个 UTF-8 JSON；stdout 恰好一个 response，stderr 只输出诊断，成功 0、错误非零。
- in-process：Provider Engine `handle()` 直接调用同一 dispatcher。
- Server client CLI 只转发完整消息；Standalone CLI 使用同一 Provider/Composition Root。

HTTP、CLI 不复制 Action 分支或业务规则。日志只包含 message ID、Action、status/error code，不记录完整 payload、路径或速记正文。

### 11. Web UI 只保留视图和客户端交互状态

UI 启动时调用 `dashboard.snapshot.get`，把 aggregateRevision 保存在内存。新增、编辑、置顶、删除、导入、导出和 probe 全部发送 EngineMessage；成功后使用 response/snapshot 更新视图。搜索、当前 Tab、theme、hover、toast 和未提交表单仍是客户端状态。

Server 不可用或直接打开 HTML 时 UI 进入明确的只读连接失败状态，不回退为 localStorage 写入者。浏览器拖放若不能提供绝对路径，仍只预填表单；最终写入由 `dashboard.path.upsert` 校验。

### 12. legacy 迁移使用正式 backup import

首次成功连接后，UI 检查 `local-dashboard.paths.v1` 和 `local-dashboard.notes.v1`。发现数据且没有迁移标记时展示数量并要求明确确认。确认后先调用 `dashboard.backup.import` 的 `dryRun=true, mode=merge`，再显示校验摘要并提交正式 import。

只有 Engine 返回已提交的新 revision 后记录迁移标记；旧 paths/notes 不自动删除。UI 提供“清理旧数据”按钮，经再次确认后只删除 legacy paths/notes，theme 保留。

Import 同时接受：

- legacy `{format:"dashboard-key-value-list", version:1, paths, notes}`；
- Engine `{format:"dashboard-engine-backup", version:1, paths, notes, projects, ...}`。

`replace` 完整替换三类目录，`merge` 按 Path 规范化值和 Note/Project ID 合并；任何元素非法都拒绝整个导入。

### 13. 路径分组颜色采用向后兼容的可选字段

Path public item、状态和 Engine backup 增加可选 `groupColor`，格式固定为六位十六进制颜色 `#RRGGBB`。字段保持可选，因此现有 schemaVersion 1.0 aggregate 和旧 Engine backup 无需重写即可继续加载；新建或编辑路径时 UI 会提交显式颜色。

legacy `dashboard-key-value-list` 继续接受历史 `color` 字段，并在它是合法六位十六进制颜色时映射为 `groupColor`。没有持久化颜色的旧路径由 Web UI 根据 group 名称选择稳定的鲜艳默认色，只有用户保存后才进入 Engine 状态。颜色仅影响呈现，不参与路径身份、去重或 revision 规则。

编辑弹窗提供有限的鲜艳色板和原生自定义取色器。列表将 GROUP 放大为标签并与 NAME、NOTE 同行，保持紧凑三列布局；所有持久化仍通过 `dashboard.path.upsert`。

### 14. GROUP 升级为独立 Registry 实体

颜色不能继续归属于单条 Path。Aggregate 增加 `groups` 集合，每个 Group Item 拥有稳定 `id`、唯一规范化 `name`、共享 `color` 和时间戳；Path 增加 `groupId` 引用，并保留同步的 `group` 名称作为公开兼容字段。Group Item 是名称与颜色的权威，修改 Group 时同一事务更新引用路径的兼容名称。

`dashboard.group.upsert` 创建或编辑 Group，`dashboard.group.delete` 只允许删除未被任何 Path 引用的 Group。`dashboard.path.upsert` 优先解析 groupId；旧客户端只提交 group 名称时按规范化名称解析或原子创建 Group。旧的 path-level groupColor 仅作为迁移输入：启动升级时同名 Path 合并到一个 Group，选择已有合法颜色或稳定默认色，然后从新持久化 Path 中移除逐条颜色。

Repository 在持有 single-writer 锁后检测旧 schemaVersion 1.0 aggregate 是否缺少 groups/groupId；若需要，生成 Registry、写入引用并以一个可备份的 revision 原子升级。旧文件在候选完整验证前保持不变。

Web UI 提供独立 Group Registry 弹窗，显示共享颜色、名称和引用数。路径行和过滤器按 groupId/Registry 解析；在任一路径编辑中改变共享颜色，也由 Domain 更新同一 Group Item，因此所有引用路径刷新后颜色一致。

### 15. Electron Desktop Shell 只增加受限本机拖放能力

Electron 作为可选 Inbound Host 复用现有 `index.html`、`app.js` 和 loopback `POST /engine-message`，不创建桌面专用业务 API。Desktop Main Process 启动时先验证 `http://127.0.0.1:4173` 是否为可用 Dashboard Server；已有 Server 时只连接，未运行时才创建并拥有 Server，退出时仅停止自己创建的实例，因此不会产生第二个状态写入者。

Renderer 保持 `nodeIntegration: false` 和 `contextIsolation: true`。Preload 只暴露 `getPathForFile(file)`，内部调用 Electron `webUtils.getPathForFile`；不暴露 `fs`、shell、任意 IPC、进程环境或命令执行能力。拖入对象的绝对路径只用于预填现有 Path 编辑弹窗，最终仍由 `dashboard.path.upsert` 和 Domain 校验后写入。

普通浏览器继续尝试标准 `text/uri-list`、`text/plain` 和可用的非标准 File path；若浏览器未暴露绝对路径，则保留文件名、空 VALUE 和明确提示。Desktop 能力缺失不得伪造路径或改变 Web UI 的 EngineMessage-only 写入边界。

## Risks / Trade-offs

- [标准浏览器不暴露拖放绝对路径] → Electron Desktop Shell 通过受限 preload bridge 提供真实路径；普通浏览器保留文件名预填和明确提示，不伪造路径。
- [单 JSON aggregate 随数据增长] → 当前数据规模小且便于原子替换；设置项目/路径/速记数量和字段长度上限，未来规模触发独立存储 Change。
- [自有 Schema Validator 支持集有限] → 对支持关键字显式白名单并失败得响亮；契约测试覆盖每个正式 Schema，未来需要时替换 Adapter。
- [Server crash 遗留锁] → 锁记录 PID/host，只清理同主机已确认死亡的 owner；不确定时宁可冲突而非双写。
- [默认用户数据目录在不同平台不同] → Composition 配置集中解析并允许 `DASHBOARD_RUNTIME_DIR` 覆盖；测试不依赖默认目录。
- [legacy merge 产生语义冲突] → dry-run 返回新增/更新/跳过数量，用户确认后一次提交；replace 必须显式选择。
- [项目 endpoint 探测可能触发本地服务副作用] → 使用 HEAD，必要时回退 GET 只读取少量响应并立即销毁；仅 loopback、短超时、无重试、无 redirect。
- [直接打开 HTML 行为变化] → 保留 UI shell 和 legacy 检测但禁止写入；README 给出 Server 启动与回滚说明。

## Migration Plan

1. 冻结现有 Application 基线，创建本 Change；根注册表先改为 `engine/nonconformant` 并指向 manifest。
2. 建立 manifest、Catalog、Action Schema 和 Provider/Validator/Dispatcher 骨架，以 `engine.describe`、`system.health` 先形成最小黑盒入口。
3. 实现 Domain/Application/Ports、JSON Repository、原子写入和 ownership lock；用临时目录完成状态测试。
4. 实现 path/note/project/snapshot/backup/probe Action 和 CLI，完成契约与集成测试。
5. 将 Server 适配为静态 Host + HTTP EngineMessage；再把现有 UI 迁移为 EngineMessage Client。
6. 启用 legacy localStorage dry-run/确认/提交迁移；旧数据始终保留到用户手动清理。
7. 执行 Dashboard 全套测试、OpenSpec、CLI stdin/message-file、HTTP、重启恢复、锁冲突和 backup v1 验证。
8. 更新 README/AGENT 和根注册表证据，执行根静态/黑盒 conformance。
9. 只有根 runner 对 dashboard 真正通过才设置 `engine/conformant`；否则保持 `engine/nonconformant` 并记录真实失败。

回滚：停止新 Server，保留 Engine runtime aggregate 和备份；恢复旧静态文件版本即可继续读取未删除的 legacy localStorage。回滚不需要修改其他 Engine 或迁移其数据。

## Open Questions

- 无阻塞问题。未来若 Dashboard 数据规模超出单 aggregate 的明确上限，或需要真实跨 Engine 依赖/远程 probe，将分别通过新的存储或协议 Change 设计，不在本迁移中预先扩张。
