# 军长下发：[GE][军长-执行][WorkPerch] #14 任务单：D-11 处置——退旧 App + 归档防再犯 + 旧→新数据补迁

> 授权方：Owner（2026-10-20 09:25 裁决：退出旧 App + 归档改名防再犯 + 注意旧往新的数据拷贝迁移）
> 下达方：[GE][军长][WorkPerch]
> 承接方：[GE][军长-执行][WorkPerch]
> 日期：2026-10-20
> 依据：台账 v1.11（`136caf9`）；D-11 实锤：归档副本 Dashboard-installed-original.app（PID 6213）今 07:02 起独占 4173，写的是旧状态根 `~/.local/share/dashboard-engine`，与新状态根 `~/.local/share/perch-engine`（昨夜 00:16 后无写入）存在分叉窗口
> 本文是 #14 的唯一施工授权依据；冲突事实停止并回报军长。

---

## 0. 目标与总判据

- 4173 归还 Perch.app 且 health ready；归档 App 防误启动改造完成；**旧状态根自迁移基线（rev 1835，46 paths/10 tags/7 projects）以来的全部增量已并入新状态，新状态 counts 全项 ≥ 迁移基线且增量项按 ID 可核对**；旧根原样保留不删。

## 1. 施工步骤（按序，每步过闸才进下一步）

1. **复核**：`lsof`/`ps` 确认 4173 监听者与 PID 与任务单记载一致（不一致则停止回报）。
2. **优雅退出旧 App**：`osascript -e 'quit app "Dashboard"'`（如其进程名已不可按名退出，用 PID 优雅 TERM）；复核 4173 释放、进程退出。不得 kill -9 起手。
3. **启动新 Perch 并占口**：`open -a Perch`；复核 4173 归 Perch、`system.health` ready。若首次启动闪退，按 #5 经验 `open -n -a Perch` 重试一次并记录。
4. **归档防再犯**：把 `~/archives/dashboard-retirement-2026-10-19/` 下两个 .app 改名为 `*-archived-do-not-launch.app`（或移入 `state/` 旁新建 `apps-quarantine/` 子目录），**只动 App 包，不动任何状态数据目录**；检查系统登录项中是否残留 Dashboard 条目（osascript 读 login items），有则回报（不擅自删，列出来等指令）。
5. **增量判定（只读）**：用 Standalone CLI 指 `PERCH_RUNTIME_DIR=~/.local/share/dashboard-engine`（旧根，只读源）跑 `perch.backup.export` 取安全摘要（revision + counts），与迁移基线 rev 1835 / 46 / 10 / 7 / 0 / 0 比对：
   - 完全一致 → 写"零增量"结论，跳过步骤 6；
   - 有增量 → 进步骤 6。
6. **增量并入新状态（EngineMessage 通道，禁止手改状态文件）**：
   - 先试 `perch.backup.import dryRun=true, mode=merge`：通过则正式 merge → snapshot 回读；
   - 若再遇 `PERCH_IMPORT_REJECTED`（D-09）→ 改逐项对账：snapshot diff（旧 vs 新，按 ID）→ 仅对**旧有新无或旧较新**的 items 用对应 Action（path 用 `perch.path.batch-upsert`/repair、tag 用 `perch.tag.upsert`、project 用 `perch.project.upsert`，均带 `expectedRevision`）写入 → 每批后回读 counts。
   - 判据：新状态 counts 全项 ≥ 迁移基线，且增量项按 ID 计数全部在新状态可见。
7. **收尾验证**：重启 Perch.app 一次，复核 4173、health、snapshot counts 与迁移后一致（持久）。

## 2. 红线

- 不删任何数据：旧根 `~/.local/share/dashboard-engine`、归档目录原样保留；只改名/移置 App 包。
- 不 `cat`/解析状态明文：全部经 backup.export 摘要与 snapshot 计数核对；逐项对账只允许 diff ID/计数/时间戳元数据，不展示用户内容原文。
- **不碰子仓工作区的 #13 在制改动**（manifest/AGENTS/README 的未提交修改是另一条棒，本单不得提交、不得还原、不得叠加修改）。
- 不动根仓任何东西；不动 `~/Library/Application Support/dashboard` 之外的系统配置。
- 单写入者：旧 App 退出后才允许新 Server 起；导入期间不得有第二个写者。
- 证据不足标 [未知]；每步留命令 + 退出码 + 关键输出原文。

## 3. 回报格式

1. 分步证据（命令/退出码/输出原文/判据）。
2. 增量判定结论：旧根 revision + counts vs 基线 1835——零增量 or 增量清单（按类型的 added/changed 计数，不含用户内容原文）。
3. 并入方式（merge 直通 / 逐项对账）与最终新状态 counts。
4. 登录项检查结果。
5. 偏差单列；结尾"并批任务回报完毕，等军长验收"。

---

**页脚**：本单存 `engine_projects/engine-work-perch/prompts/2026-10-20-14-d11-contain-prompt.md`，随子仓提交。
