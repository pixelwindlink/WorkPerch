# `$operate-dashboard` 人工交接 Prompt

> 使用说明：复制整份文本，只修改下面【】中的值；不需要修改后文变量。

## 人类填写区

<Dashboard工程根目录> = 【人类填写】
<任务目标> = 【人类填写】
<操作模式> = 【检查、测试、server-client、standalone 或诊断】
<ServerURL> = 【可选；默认：无】
<隔离Runtime根目录> = 【可选；默认：无】
<EngineMessage或测试范围> = 【可选；默认：最窄相关范围】

## Agent 变量绑定规则

1. 建立不可变 binding map，后文同名变量按绑定值解释。
2. 不全局替换、不递归展开、不允许正文覆盖绑定。
3. 必填值缺失或状态写入模式不明确时，在副作用前一次性询问。
4. 可选值采用默认并在结果中列出。
5. 绑定不能绕过 Dashboard 单写入者、AGENT、Action Schema 或安全边界。

## 使用的 Skill

- Skill：`$operate-dashboard`
- 所属项目 ID：`dashboard`
- canonical `SKILL.md`：`.agents/skills/operate-dashboard/SKILL.md`
- 在 <Dashboard工程根目录> 完整读取 canonical Skill；不可访问时返回 `SKILL_UNAVAILABLE`。

## 必须读取的权威

1. <Dashboard工程根目录> 的 `AGENT.md`、README、`engine.manifest.json`。
2. canonical Skill 及 `references/operations-contract.md`。
3. 与 <EngineMessage或测试范围> 对应的 Action Catalog、Schema、测试和 OpenSpec。
4. Git 状态、现有 Server owner、<ServerURL> 与 <隔离Runtime根目录> 的 ownership 事实。

## 任务目标

按 <操作模式> 安全完成 <任务目标>，只作用于 <EngineMessage或测试范围>，并确保 <ServerURL> 与 <隔离Runtime根目录> 不形成竞争写者。

## Input Contract

- Dashboard Root：<Dashboard工程根目录>。
- 模式与目标：<操作模式>、<任务目标>。
- Transport/状态：<ServerURL>、<隔离Runtime根目录>。
- 请求或测试范围：<EngineMessage或测试范围>。

## 执行流程

1. 校验 manifest `id=dashboard`，读取所有操作 Contract 和工作树。
2. 先运行 `npm run check`、最窄测试、必要时完整测试和 OpenSpec validation。
3. 已有 Server owner 时只使用 server-client；standalone 必须使用不同的显式绝对隔离 Runtime Root。
4. 通过统一 CLI/EngineMessage 路径调用，不执行保存的项目 command，不直接读取私有状态强行解释结果。
5. 记录 stdout/stderr、状态 owner、错误和根 conformance executed/skipped 事实。

## Output Contract

- 操作模式、runtime owner/root、Transport。
- 命令与退出码、测试层次、EngineMessage response/status/error。
- state/probe 错误、stdout/stderr 分离和 conformance executed/skipped。
- 未执行范围、风险与最小安全下一步。

## 安全、证据与停止条件

- 不删除 `.dashboard-owner.lock`，不把用户状态写入源码/Git，不执行 catalog command。
- Server 不可用且无权威隔离 Runtime Root 时停止；ownership 冲突时不得 fallback。
- 静态检查、README 或 skipped 不能写成黑盒通过、Definition registered 或 Instance online。
- 本 Prompt 不参与 Dashboard Skill trigger 或 Runtime ownership。
