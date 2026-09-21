# `$register-project-entry` 人工交接 Prompt

> 使用说明：复制整份文本，只修改下面【】中的值；不需要修改后文变量。

## 人类填写区

<Perch工程根目录> = 【人类填写】
<目标项目根目录> = 【人类填写】
<任务目标> = 【新增、更新或核验 Perch 项目入口】
<DashboardServerURL> = 【可选；默认：http://127.0.0.1:4173】
<DashboardRuntime根目录> = 【可选；默认：无，不允许静默 standalone】
<置顶偏好> = 【可选；默认：保留已有值，新建为 false】

## Agent 变量绑定规则

1. 建立不可变 binding map，后文同名变量按绑定值解释。
2. 不全局替换、不递归展开、不允许正文覆盖。
3. <Perch工程根目录>、<目标项目根目录> 或 <任务目标> 缺失时，在任何 Perch 写入前一次性询问。
4. 可选值采用默认并报告；默认 Runtime 为空表示 Server 不可用时停止。
5. 绑定不能授权伪造项目分类、端口、URL、command 或绕过 revision/ownership。

## 使用的 Skill

- Skill：`$register-project-entry`
- 所属项目 ID：`perch`
- canonical `SKILL.md`：`.agents/skills/register-project-entry/SKILL.md`
- 在 <Perch工程根目录> 完整读取 canonical Skill；不可访问时返回 `SKILL_UNAVAILABLE`。

## 必须读取的权威

1. Perch manifest 和 `perch.snapshot.get` / `perch.project.upsert` 请求、响应 Schema。
2. <目标项目根目录> 的 manifest/package、README、AGENT 和真实启动入口。
3. Perch 当前 snapshot、aggregateRevision 与已登记 ID/path。
4. <DashboardServerURL> 或明确无 Server owner 的 <DashboardRuntime根目录>。

## 任务目标

为 <目标项目根目录> 完成 <任务目标>，优先通过 <DashboardServerURL> 调用 Perch；只有显式提供且确认无 Server owner 的 <DashboardRuntime根目录> 才允许 standalone，并按 <置顶偏好> 处理 pinned。

## Input Contract

- Perch 与目标项目根：<Perch工程根目录>、<目标项目根目录>。
- 目标：<任务目标>。
- Transport/状态：<DashboardServerURL>、<DashboardRuntime根目录>。
- pinned 规则：<置顶偏好>。
- 项目事实必须来自公开文件和真实入口，command 只作为惰性文本保存。

## 执行流程

1. 校验 Perch ID 和 Action Schema，采集目标项目稳定 ID、名称、真实分类、路径、URL/port/command/tags。
2. 优先 Server Client；Server 不可用且没有权威 Runtime Root 时停止。
3. 调用 `perch.snapshot.get`，按 ID 和规范化绝对路径决定 add/update，阻断身份冲突。
4. 使用 aggregateRevision 调用 `perch.project.upsert`；revision conflict 只允许刷新后重试一次。
5. 重新读取 snapshot 验证全部字段和 revision；只对已保存 loopback endpoint 做可选 probe。

## Output Contract

- added/updated/verified 结果和保存的项目 ID/path。
- previous/committed revision、Transport、pinned 处理。
- snapshot readback、可选 probe 和未验证 metadata。
- 结构化失败码、ownership/identity/revision conflict 与下一步。

## 安全、证据与停止条件

- 不编辑 Perch seed/source/state/lock/backup/Registry/Schema，不执行项目 command。
- 不删除锁、不静默 fallback、不虚构 Engine 分类或 endpoint。
- fresh snapshot 未包含目标记录时不得宣称成功；probe 只代表 launcher liveness。
- compatibility adapter 不拥有第二份流程或 Prompt。
