# 补齐 Skill 原子使用说明

当目标工程已有 `SKILL.md`，但缺少 Manual、Prompt 或 UI 元数据时，使用专用命令原位补齐。它只创建缺失文件，不迁移、不覆盖、不改分类或 sidecar。

```bash
seshat skills review --target /绝对路径/工程 --json
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --dry-run --json
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --json
```

若需要在补齐 companion 的同时生成语义化中文 UI，使用统一预检：

```bash
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --localize-ui --dry-run --json
seshat skills complete --target /绝对路径/工程 --skill <skill-id> --localize-ui --json
```

组合计划会先用内存中的 proposed Manual、Prompt 与 metadata 检查 localization。任一阶段 blocked 时 exit 2 且不写文件；已有完整 atom 也不会跳过 localization。若现有中文来源足够而只缺 metadata，计划直接创建最终中文内容，不落盘中间占位版本。异常结果中的 `executionState=partial` 表示至少一个受限写入已完成，必须审查两个 phase 后重新 dry-run，不能手工覆盖。

completion phase 生成的文本会明确标记“未确定/派生自 SKILL.md”，因此不能把补齐结果当作完整行为说明，也不会覆盖任何已有 companion。已有 `agents/openai.yaml` 会被保留，不会另建 `openai.yml`；只有显式 `--localize-ui` 的独立 localization phase 可以在自身授权与前置条件下更新 project-owned UI metadata。若 atom 已完整且只有 UI 需要修复，直接使用 `skills localize-ui` 或 conformance remediation。Seshat 自有 `seshat-*` Skill 缺文件时，应使用 `seshat init` 恢复同版本 bundle。

应用后重新运行 `skills list`、`skills review`，必要时为非 Seshat Skill 运行 `skills register --dry-run`；第二次相同 standalone 或组合 dry-run 必须是 `no-changes`。
