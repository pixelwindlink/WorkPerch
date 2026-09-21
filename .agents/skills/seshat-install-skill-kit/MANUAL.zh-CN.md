# Seshat Skill Kit 安装说明

安装器把可信 Provider 中的全部 canonical Seshat Skill、README/AGENTS 入口、OpenSpec 基础、工程地图、导航清单和 `project-governance/seshat-kit-lock.json` 安装到明确目标工程。首次接入前应先确认 `seshat` 可执行入口或显式 Provider checkout，并运行 compatibility check/bootstrap。

```bash
seshat compatibility check --target /绝对路径/工程 --provider-root /绝对路径/seshat --json
seshat bootstrap --target /绝对路径/工程 --provider-root /绝对路径/seshat --dry-run --json
seshat upgrade --target /绝对路径/工程 --provider-root /绝对路径/seshat --dry-run --json
```

确认计划中的治理等级、候选类型章节引用、provisional 状态、Authority、消费者、生命周期和预检条件后，执行同一命令并去掉 `--dry-run`。安装不会复制 Seshat 需求文档，不会创建通用 `path-rules.json` 或空 `machine-assets/`，也不会修改目标已有机器契约、Schema、模板、Registry、Policy、配置、源码或 Runtime 数据。仅当目标尚无 OpenSpec 工作区时，可以创建最小 `openspec/config.yaml`；已有配置必须保持不变。

外部使用时必须先安装 Seshat 包或提供可信的 `bin/seshat.mjs` 绝对路径。计划中的 `writeAuthorization` 只能是强制治理、OpenSpec 首次引导或同版本 canonical Skill 元数据分发；已有 Skill 原子内容不同表示需要单独审查升级，安装器不会静默覆盖。

Provider 清单必须包含精确 canonical Skill ID、executable、所需 Schema、四个基础 companion 与按需使用的 `references/`、`scripts/`、`assets/` 递归资源，并绑定逐文件 byte digest。二进制素材始终以 Buffer 安装和升级，写后重新读取验证。缺失 bundled Skill、无效 Skill/Schema、未知文件或同时存在两种 `openai.yml|yaml` 时必须阻断，不能静默漏装。

receipt 比较按稳定语义进行：JSON key order 与限定的更新时间不造成假冲突，但 Provider、Agent、profile、delivery、path 或 digest 变化仍必须被识别。若已有写入完成后后续 precondition 失败，结果必须为 `partial`，列出 completed/pending/blocked 和安全恢复动作；不得回滚覆盖新内容，也不得声称完整 applied。

安装后先刷新或新开 Agent 会话，再使用 `seshat-assure-project-governance` / `seshat assure --review → --dry-run → --apply` 完成目标工程的统一治理收敛，最后运行 verify 和第二次 bootstrap/init/upgrade dry-run。Owner 不需要手工串联所有低层命令，只处理 assurance 输出的 Authority、所有权、业务意图与 outside 路线决策。框架反馈 Skill 只通过授权 Provider 写入 Seshat 自身 `artifacts/review/`，不在目标工程创建反馈产物；没有 Provider 时必须阻断。
