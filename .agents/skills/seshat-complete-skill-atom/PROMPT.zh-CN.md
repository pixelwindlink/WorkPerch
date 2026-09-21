# 补齐 Skill 原子职责交接 Prompt

对用户明确指定的目标工程，先运行来源与分类审查，再运行补齐预览：

```bash
seshat skills review --target /绝对路径/工程 --json
```

确认目标 Skill 的来源、分类和 Finding 后，再运行：

```bash
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --dry-run --json
```

如果同时要求中文 UI 元数据，改用组合预览：

```bash
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --localize-ui --dry-run --json
```

必须同时审查 `phases.completion`、`phases.localization`、`executionState` 和 localization `fieldDiff`。任一 phase blocked 时不得写入并要求 exit 2；completion 即使为 `no-changes` 也必须继续 localization。缺失 metadata 只有在语义派生有效时才可直接创建最终中文 bytes，不得先落盘占位版本。预检后的异常若返回 `partial`，先按 phase 核对已完成路径，再重跑 dry-run；不得把 partial 宣称为成功。

仅当目标存在合法 `SKILL.md` 且计划无冲突时，才可按授权执行同一命令去掉 `--dry-run`。completion phase 只允许创建缺失的 `MANUAL.zh-CN.md`、`PROMPT.zh-CN.md` 和 `agents/openai.yml`；已有文件不得由 completion 覆盖，已有 `agents/openai.yaml` 不改名也不复制。只有显式组合请求中的 localization phase 可在自己的授权与 digest 前置条件下更新 project-owned UI metadata；若没有缺失 companion 而只是 UI 漂移，应改用 `skills localize-ui` 或 conformance remediation。

生成内容必须写明“未确定/派生自 SKILL.md”，不能凭空补充行为、输入、Owner、能力或验证事实。`seshat-*` bundle 缺文件时不要生成占位内容，改走 `seshat init` 恢复流程。不要迁移目录、修改 `skillClass`、写 `seshat-governance.json`、调用 standardize 或改变 Git 状态。

完成后运行 `seshat skills list` 与 `seshat skills review`；非 Seshat Skill 再按治理 Finding 登记来源；再次执行相同 standalone 或组合 dry-run 必须返回 `no-changes`。
