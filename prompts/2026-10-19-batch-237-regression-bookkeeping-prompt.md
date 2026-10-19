# 军长下发：[GE][军长-执行][WorkPerch] 并批任务单：#7 回归验证 + #2 簿记收口 + #3 证据补取

> 授权方：Owner（2026-10-19 13:54 批准下发；前置裁决：10:00 退役、11:22 replace 收工路线）
> 下达方：[GE][军长][WorkPerch]
> 承接方：[GE][军长-执行][WorkPerch]
> 日期：2026-10-19
> 依据：台账 v1.7（`98db74a`）；#5 已收工（新 Perch.app PID 18302 独占 4173，状态 rev 5 全量迁移）
> 本文是三件任务的唯一施工授权依据；发现与本单冲突的事实，停止并回报军长。

---

## 0. 通用红线

1. 只碰 `engine-work-perch` 子仓 + GE 根仓只读命令；不碰根仓 `governance/`、`openspec/`、根 `package.json`、其他 `engine_projects/`；**不碰 `LEDGERS.md`**（统帅部权属，D-07 未登记）。
2. 不读/不改任何 `runtime_data/` 内容；不读 `perch-state.json` 明文，只走 EngineMessage 通道取计数摘要。
3. 不删除任何用户数据与归档（`~/archives/dashboard-retirement-2026-10-19/` 只读）。
4. 4173 当前归 Perch.app（PID 18302）独占：任何会重启它的动作先回报，禁止擅自重启用户正在用的 App。
5. **子仓改动一律留在工作区不提交**（工程 AGENTS.md：不自动创建 Git commit）；回报 diff 清单，由军长验收后按授权处理。
6. 不自动归档 OpenSpec Change（工程 AGENTS.md）；rename Change 只勾画不归档，归档等 Owner 点头。
7. 证据不足标 [未知]，禁止编造数字与 hash。

---

## 1. #7 退役后回归验证（只读为主）

1. 子仓 `npm run check` + `npm test`：判据 = 全过（基线 60/60）。
2. 运行态冒烟（全部经 EngineMessage/HTTP，不动 App 进程）：
   - `POST /engine-message` `system.health` → `state=ready`、独占锁 pass；
   - `perch.snapshot.get` → 计数全项 = tags 10 / paths 46 / notes 0 / projects 7 / savedViews 0，revision = 5；
   - `GET http://127.0.0.1:4173/` → 200（Web UI 可加载）。
3. GE 根只读黑盒（#3 一并做）：从 `/Users/ugreen/workspace/generic_engines` 跑
   `node conformance/runner.mjs --engine work-perch --json` 与 `--static-only --json`，
   回报退出码与结果 JSON 原文（这是 Registry runtime 证据补取；**只运行，不改 Registry**）。
4. 判据：以上全过 → #7 ✅；任一不过 → 如实回报，不得修补。

## 2. #2 簿记收口批（子仓工作区改动，不提交）

按序施工，每步附 before/after 证据：

1. **D-01 README 失效引用修正**（只改引用，不动其他表述）：
   - `openspec/changes/convert-perch-application-to-engine/` → 实际归档路径 `openspec/changes/archive/2026-07-28-convert-dashboard-application-to-engine/`；
   - 桌面开发段落 `cd .../engine-perch` → `engine-work-perch`。
2. **D-02 剩余**：README 发布段落对齐磁盘事实——`dist/desktop/Perch-darwin-arm64/Perch.app` 已存在（可写"开发构建产物"），`release/Perch-2.1.0-arm64.dmg` 宣称改为与现状一致的表述（不写不存在的文件）。
3. **D-04 rename Change 勾画（不归档）**：逐条核对 `openspec/changes/rename-dashboard-to-perch-v1/tasks.md` 34 项的实际完成情况——勾画须有证据（对应文件存在/commit/实测），核不动的条目保持未勾并注明原因；**完成后回报勾画清单，归档动作暂停待 Owner**。
4. **D-06 建 `HANDOFF.md`**：项目级 AI 交接面，含——当前进展（#5 收工、rev 5 全量数据、4173 归 Perch）、进行中（无）、待办（#12、R1–R4 立项、#6）、关键决策（Owner 10:00 退役、11:21 R1–R4 裁决、11:22 replace 路线、11:29 全量迁移、11:32 prompts/ 落位约定、13:54 本单）。格式参考 GE 根 `HANDOFF.md` 的轻量结构，一句话一条，不堆事实。
5. 改完跑 `npm run check` + `npm test` +（执行环境有 CLI 则）`openspec validate --all --json`，回报退出码。
6. 回报 `git diff --stat` 与逐文件改动说明；**不得 commit、不得自动归档 Change**。

## 3. 交卷格式

1. 三块各自：步骤 → 命令/改动 → 退出码或证据原文 → 判据结论。
2. 汇总表：#7 ✅/🟡/❌、D-01/D-02/D-04/D-06 各自状态、#3 conformance 结果原文链接（贴 JSON 要点）。
3. 偏差单列：与本单不符的事实附实锤。
4. 不用"收工"回执语（本单是批次施工不是战役收口）；以"并批任务回报完毕，等军长验收"结尾。

---

**页脚**：本单存 `engine_projects/engine-work-perch/prompts/2026-10-19-batch-237-regression-bookkeeping-prompt.md`，随子仓提交。
