# 将当前工程接入 Dashboard 项目入口

读取并严格使用以下 Skill：

`/Users/ugreen/workspace/generic_engines/engine_projects/dashboard/skills/register-project-entry/SKILL.md`

## 目标

将你当前负责的工程注册或更新到 Dashboard Engine 的“项目入口”。

Dashboard Server：

`http://127.0.0.1:4173`

## 执行要求

1. 自动读取当前工程的真实信息：
   - 稳定项目 ID
   - 项目名称
   - 项目类型和显示标签
   - 简短职责描述
   - 当前工程根目录的绝对路径
   - 真实 HTTP(S) 启动地址和端口；不存在则使用空 URL 和端口 `0`
   - 真实启动命令；该命令只能作为字符串保存和复制，禁止执行
   - 能从工程事实中确认的标签
2. 优先依据 manifest、package metadata、README、实际入口和运行配置，不得虚构端口、URL、Engine 身份或运行证据。
3. 通过 Dashboard CLI 的 Server Client 模式调用正式 EngineMessage Action：
   - 先调用 `dashboard.snapshot.get`
   - 检查稳定 ID 和规范化绝对路径是否已经收录
   - 使用当前 `aggregateRevision` 调用 `dashboard.project.upsert`
   - 成功后再次调用 `dashboard.snapshot.get` 回读验证
4. 已存在相同路径时更新原条目，不创建重复项目。
5. 遇到 `DASHBOARD_REVISION_CONFLICT` 时重新读取 snapshot、重新核对后最多重试一次。
6. 遇到 `STATE_OWNERSHIP_CONFLICT` 或 Server 无法连接时停止并报告，不得删除锁、直接修改状态文件或静默切换为另一个写入者。
7. 禁止直接修改 Dashboard seed、`app.js`、`dashboard-state.json`、备份、锁、Action Schema 或根注册表来完成注册。

## 完成报告

完成后明确返回：

- 操作结果：新增、更新或未变更
- 保存的项目 ID、名称和绝对路径
- 项目类型、URL、端口、启动命令和标签
- 使用的 Dashboard Transport
- 修改前和提交后的 aggregate revision
- 回读验证结果
- 未能确认或主动留空的字段

只有在最新 snapshot 中找到符合预期的项目条目后，才能声明接入成功。
