# #14 D-11 处置 — 执行回报（2026-10-22）

> 承接：Owner 10-20 09:25 裁决 + 本会话 Owner「要新应用、数据保留」指令

## 判据结论

| 判据 | 结果 [实测] |
|------|-------------|
| 4173 归 Perch.app | ✅ Perch 监听 127.0.0.1:4173 |
| system.health ready | ✅ state=ready |
| 旧根增量并入新状态 | ✅ merge 后 rev 47，paths 47 / tags 10 / projects 7 / notes 0 |
| 归档 App 防误启动 | ✅ 移入 `~/archives/.../apps-quarantine/` 并 `lsregister -u`；Dock 旧钉已移除 |
| 重启持久 | ✅ quit → reopen 后 counts 不变 |

## 增量判定

- 旧服务导出（engine `dashboard`）相对 perch 基线：**+2 paths 更新、+45 paths 更新类 merge 摘要**（导出 rev 1899 → 并入后 rev 47）。
- 旧状态根与归档数据 **未删除**。

## 偏差

- 台账 v1.13 快照仍写「未见执行」——本回报补交施工证据；未改台账（执行侧不写根仓 ledger）。

并批任务回报完毕，等军长验收。
