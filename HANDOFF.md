# WorkPerch AI 交接

## 当前进展

- #5 退役换装已完成：`/Applications/Perch.app` 当前持有 `127.0.0.1:4173`，生产状态通过 replace 迁移，snapshot revision 5、tags 10、paths 46、projects 7、notes 0、savedViews 0 均已重启复核。[实测]
- 旧 Dashboard App、旧状态根和界面偏好已复制归档，原状态根保留，回滚资产位于 `~/archives/dashboard-retirement-2026-10-19/`。[实测]
- #7 本批复核时 health ready、counts 仍为 tags 10 / paths 46 / projects 7 / notes 0 / savedViews 0、Web UI 返回 200，但当前 snapshot revision 为 13，不再是任务单基线 5；未修改状态或重启 App。[实测]
- #3 本批根黑盒因 manifest 1.2 不满足当前 1.3 admission 而未执行 Engine checks；static-only 另有根仓既有治理漂移。[实测]
- 当前工程入口为项目 ID `work-perch`、产品名 WorkPerch，独立仓起始 HEAD 为 `e5ab7e0`。[实测]

## 进行中

- 无。[实测]

## 待办

- #12：另立 OpenSpec Change 修复 `perch.backup.import mode=merge` 的时间不变量缺陷；本交接不绕过 Engine 校验。[投影]
- R1：按 Owner 裁决立项，整体下线项目入口能力并决定旧 projects 数据处置。[投影]
- R2：按 Owner 裁决开展开源剪贴板方案选型后立项。[投影]
- R3：按 Owner 裁决在 UI 偏好中实现速记长短过滤阈值。[投影]
- R4：按 Owner 裁决在 Desktop Host 设计跨应用窗口大小保存与恢复能力。[投影]
- #6：把重复性快照、健康检查和台账核对流程整理为查询 Skill。[投影]

## 关键裁决

- Owner 2026-10-19 10:00：旧 Dashboard 退役，旧状态与旧 App 归档保留，不做删除。[实测]
- Owner 2026-10-19 11:21：R1–R4 分别裁决为项目入口整体下线、直接选型开源剪贴板、UI 偏好阈值过滤、WorkPerch Desktop Host 负责窗口恢复。[实测]
- Owner 2026-10-19 11:22：短期采用 replace 完成生产状态迁移，merge 缺陷另立 #12。[实测]
- Owner 2026-10-19 11:29：状态迁移必须全量一致，paths 46、tags 10、projects 7、notes 0、savedViews 0 一条不丢。[实测]
- Owner 2026-10-19 11:32：后续任务单与提案落在本仓 `prompts/`，历史根仓提案保留原位。[实测]
- Owner 2026-10-19 12:06：正式 replace 阶段 B 放行。[实测]
- Owner 2026-10-19 13:54：批准 #7 回归验证、#2 簿记收口与 #3 证据补取并批任务。[实测]

## 证据边界

- `runtime_data/`、归档状态文件和 `perch-state.json` 明文不属于 Agent 交接读取范围；运行状态只通过 EngineMessage、HTTP 状态和公开命令报告。
- 当前 README 是人类第一入口，本文件只记录交接、裁决和下一步，不复制 Action Contract。
