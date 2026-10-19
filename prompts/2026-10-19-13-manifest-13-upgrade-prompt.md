# 军长下发：[GE][军长-执行][WorkPerch] #13 任务单：manifest 1.2→1.3 升级 + rename Change 归档

> 授权方：Owner（2026-10-19 16:37「都批准」：子仓提交已执行 `265451c`/`8ea2443`；rename Change 归档授权并入本单；#13 批准下发）
> 下达方：[GE][军长][WorkPerch]
> 承接方：[GE][军长-执行][WorkPerch]
> 日期：2026-10-19
> 依据：台账 v1.9（`51982d1`）；D-10 实锤（根黑盒报 "manifest uses legacy manifest 1.2; current admission requires 1.3"，EXIT 1）
> 本文是 #13 的唯一施工授权依据；冲突事实停止并回报军长。

---

## 0. 目标与判据

- **总判据**：升级后从 GE 根执行 `node conformance/runner.mjs --engine work-perch --json` 不再被 manifest 版本拒绝，Engine checks 真正跑起来并输出结果（pass/fail 都如实报，fail 不修补、原样呈报）。
- 前置：`npm run check`、`npm test`（60/60）、`openspec validate --all`（15/15）全保持。

## 1. 施工步骤（按序）

1. **归档 rename Change（Owner 16:37 授权）**：把 `openspec/changes/rename-dashboard-to-perch-v1/` 按工程既有 archive 结构移入 `openspec/changes/archive/`（命名风格参考既有 `2026-07-28-*`；若 openspec CLI 有 archive 子命令优先用 CLI）；归档后 `openspec validate --all` 仍须全过。
2. **读 1.3 门槛**：在 GE 根 `/Users/ugreen/workspace/generic_engines/governance/manifests/` 找到 manifest 1.3 Schema 与准入校验器，逐字段列出 1.2→1.3 的差集（新增必填、语义变更、废弃字段），回报差集清单。
3. **升级 `engine.manifest.json`**：按差集升级（保留 id/version/分类/语义不变，只补结构与必填项）；同步刷 README 与 AGENTS.md 中 "manifest 1.2" 表述。
4. **验证**：工程内 check/test/validate 全跑；GE 根跑 `--static-only --json` 与 `--engine work-perch --json`，贴结果原文。static-only 中根仓既有五项治理漂移（architecture-authority 等）非本单目标，如实报即可。
5. **不提交**：改动留工作区，回报 `git diff --stat` 与逐文件说明；归档动作本身也留在工作区由军长统一提交。

## 2. 红线

沿用并批任务单通用红线：不动根仓 `governance/`、`openspec/`、根 `package.json`（只读引用 1.3 Schema）；不动 `runtime_data/` 与状态明文；不碰其他工程；不重启 4173 上的 Perch；证据不足标 [未知]；**manifest 语义只增不改**——不得借升级之机改动 Engine 行为、Action 集合或消费者声明（R1 另有立项）。

## 3. 回报格式

1. 每步命令 + 退出码 + 关键输出原文。
2. 1.2→1.3 差集清单与逐项处置对照表。
3. 黑盒 conformance 结果原文（过/不过都贴）。
4. `git diff --stat`；结尾"并批任务回报完毕，等军长验收"。

---

**页脚**：本单存 `engine_projects/engine-work-perch/prompts/2026-10-19-13-manifest-13-upgrade-prompt.md`，随子仓提交。
