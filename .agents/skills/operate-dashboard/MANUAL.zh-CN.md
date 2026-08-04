# `operate-dashboard` 中文说明书

> 非运行声明：本文件仅供人类阅读，不参与 Dashboard Skill 触发、Server/CLI 启动、EngineMessage 调用或状态 ownership 判定。

## 基本信息

| 项目 | 内容 |
|---|---|
| Skill ID | `operate-dashboard` |
| 所属项目 | `dashboard` Engine |
| 类型 | Operations / Engine 操作 |
| canonical 运行入口 | 同目录 `SKILL.md` |

## 用途与适用场景

用于安全检查、测试、启动、调用和诊断 Dashboard Engine，覆盖 Server、CLI、Web UI、EngineMessage endpoint、临时 runtime、项目入口目录和根黑盒 conformance。

## 负责什么

- 通过 manifest `id=dashboard` 定位 Engine Root。
- 读取项目 AGENT/README/manifest/operations Contract。
- 运行 check、定向测试、完整测试和本地 OpenSpec validation。
- 选择 Server Client 或隔离 Standalone Exclusive 模式。
- 使用公共 EngineMessage 和根 conformance 获取运行证据。

## 不负责什么

- 不建立第二个写者或绕过 `.dashboard-owner.lock`。
- 不执行保存的项目 command；它只是目录数据。
- 不把用户状态写入源码、测试或 Git。
- 不读取私有状态强行解释 conformance 通过。

## 执行前准备

- Dashboard Root、manifest、AGENT、README 和 operations Contract。
- 当前 Git/OpenSpec 状态。
- Server 模式的 URL，或明确、绝对、隔离的 `DASHBOARD_RUNTIME_DIR`。

## 典型执行流程

1. 解析 Engine Root 和公开 Contract。
2. 检查工作树与 Change。
3. 先运行静态检查和测试。
4. 已有 Server owner 时使用 Server Client CLI。
5. 只有不同的隔离绝对 runtime root 才能使用 Standalone Exclusive。
6. 通过公共 EngineMessage 和根 harness 诊断结果。

## 输入

- 操作模式、Server URL 或隔离 runtime root。
- EngineMessage request、测试范围或诊断症状。

## 输出与证据

- mode、runtime owner/root、命令和退出码。
- 测试层次、EngineMessage response、state/probe error。
- 根 conformance 是否真正执行或跳过 Dashboard。

## 安全与状态边界

- Dashboard 是 `single-writer` Engine；Server 和 Standalone 不得共享同一状态根。
- CLI stdout 只能有一个 EngineMessage，诊断写 stderr。
- 用户路径、目录状态、锁和备份不得进入 Git。

## 权威与维护规则

运行权威是同目录 `SKILL.md`、Dashboard `AGENT.md`、manifest 和 operations Contract。本说明书不拥有 Dashboard Action、状态格式或 Server ownership 语义，也不证明 Dashboard 已通过黑盒 conformance。
