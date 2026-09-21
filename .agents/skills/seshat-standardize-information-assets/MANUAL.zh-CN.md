# Seshat 工程信息标准化 Skill 使用说明

本 Skill 只标准化**强制治理**资产。先预览：

```bash
seshat standardize --target /绝对路径/工程 --dry-run --json
```

计划会标注每项操作的候选资产类型、Sample 等资产角色、类型章节引用、provisional 状态、治理等级、路径规则来源、Authority、消费者和生命周期。机器契约、Schema、Template、Registry、Policy、机器 Manifest、Preset、配置与元数据属于建议治理，标准化不得移动、改名、覆盖或修改；Sample 角色不改变该边界。源码、测试、Runtime、用户数据和日志不纳入治理。

缺失 README/AGENTS 时可创建不编造事实的最小入口；已有 README 只有在章节语义无歧义时才重排。存在 canonical Skill 时，会同步刷新 `project-governance/skills-manifest.md` 与 `.agents/skills/index.html`（Skills 清单 HTML，UI 与 KMP Concept Universe 的 Skills 页一致）。完成写入后必须再次 dry-run，并得到 `no-changes`。

外部使用时必须通过已安装的 Seshat CLI 或可信绝对入口执行。每项操作必须具有明确 `writeAuthorization` 和预检条件；canonical Skill 原子的安装或升级交给安装 Skill，标准化只维护其导航。
