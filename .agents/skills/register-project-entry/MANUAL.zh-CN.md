# `register-project-entry` 中文说明书

> 非运行声明：本文件仅解释 Dashboard 项目入口登记，不参与 Skill trigger、项目事实采集、EngineMessage 构造或 Dashboard 状态写入。

## 基本信息

| 项目 | 内容 |
|---|---|
| Skill ID | `register-project-entry` |
| 所属项目 | `dashboard` Engine |
| 类型 | Capability / Dashboard 项目入口登记 |
| canonical 运行入口 | 同目录 `SKILL.md` |

## 用途与适用场景

用于把当前工程新增或更新到 Dashboard Engine 的项目启动目录。所有写入通过 `dashboard.snapshot.get` 和 `dashboard.project.upsert` EngineMessage Action 完成。

## 负责什么

- 解析 Dashboard Root 并读取 manifest 与相关 Action Schema。
- 从当前工程的 manifest/package/README/真实入口采集项目事实。
- 选择 Server Client；仅在明确授权时使用 Standalone Exclusive。
- 先读取 snapshot，处理 ID/path 匹配和 revision，再 upsert。
- 读取新 snapshot 验证保存结果，可选执行受限 loopback probe。

## 不负责什么

- 不编辑 Dashboard seed、源码、state、lock、backup、Registry 或 Action Schema。
- 不执行项目 command，只把它保存为惰性文本。
- 不把普通目录错误标成 Engine，不虚构 URL/port/command。
- 不静默 fallback 到未知 runtime root，不删除锁。
- 不把 launcher liveness probe 冒充目标 Engine `system.health`。

## 执行前准备

- Dashboard Engine 的 canonical manifest 和 snapshot/upsert Schema。
- 当前工程的稳定 ID、名称、真实分类、描述、绝对路径、URL、port、command、tags。
- 可用 Dashboard Server URL，或明确无 Server owner 的权威绝对 runtime root。

## 典型执行流程

1. 解析唯一 Dashboard Root 和公开 Contract。
2. 从当前工程公开事实构造项目资料。
3. 优先连接 Dashboard Server；不可用时按 ownership 规则停止或获取授权。
4. 调用 `dashboard.snapshot.get` 获取 projects 和 `aggregateRevision`。
5. 按 ID/path 决定新增或更新，处理 identity conflict。
6. 调用 `dashboard.project.upsert`；revision conflict 最多刷新后重试一次。
7. 再次读取 snapshot 验证全部字段和 revision。

## 输入

- 当前项目事实与 Dashboard Transport 配置。
- 完整 EngineMessage request、expectedRevision 和 upsert payload。

## 输出与证据

- added/updated 结果、保存的 project ID/path。
- previous/committed revision、使用的 Transport。
- snapshot readback、可选 probe 和尚未验证的 metadata。

## 安全与状态边界

- Dashboard aggregate 是初始化后的唯一状态权威。
- 写入必须遵守 `single-writer` 和 optimistic revision。
- 只允许探测已保存的 loopback HTTP(S) endpoint，禁止远程或临时 URL。
- 项目 command 永不执行。

## 权威与维护规则

运行权威是同目录 `SKILL.md` 和 Dashboard Action Schemas。legacy `skills/register-project-entry/` 只是 compatibility adapter，不维护第二份说明书或流程。本文件存在不表示项目已经成功登记。
