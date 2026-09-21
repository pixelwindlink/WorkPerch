---
name: seshat-complete-skill-atom
description: Complete an existing non-Seshat project Skill by creating only missing MANUAL.zh-CN.md, PROMPT.zh-CN.md and agents/openai.yml companions from a valid SKILL.md. Use when audit reports INCOMPLETE_SKILL_ATOM or the same companion-repair request must preflight semantic Chinese UI localization. Completion never overwrites; the optional localization phase may update only project-owned UI metadata under its separate authorization. If all companions exist and only UI semantics need repair, use seshat-remediate-skill-conformance or `skills localize-ui`. Never use to create SKILL.md, migrate a directory, register provenance or restore a Seshat bundle.
---

# 补齐 Skill 原子

本 Skill 只负责已有 Skill 的内容补齐。它不定义 Skill 行为，不迁移目录，不登记来源，也不替换安装器、标准化器或来源治理器。

## 适用边界

- 目标必须是明确的现有工程目录；命令必须显式提供 `--target`。
- 目标 Skill 必须已经存在 `SKILL.md`，且 frontmatter 的 `name` 是合法 lowercase kebab-case，并与目录名一致。
- 只在原目录旁创建缺失的 `MANUAL.zh-CN.md`、`PROMPT.zh-CN.md` 和 `agents/openai.yml`。
- 目标已有 `agents/openai.yaml` 时视为已有 UI 元数据，保持原位，不创建 `openai.yml`；两个扩展名同时存在时阻断。
- completion phase 不得覆盖、改名、删除或重写任何已存在的 `SKILL.md`、Manual、Prompt、`openai.yml` 或 `openai.yaml`。可选 localization phase 只可在自身计划、语义校验和 digest 前置条件下更新 project-owned UI metadata；这不是 completion 写权限。
- `seshat-*` Provider bundle 不由本 Skill 生成占位文件；缺失时回到 `seshat init` 的同版本恢复流程。
- `skillClass`、`seshat-governance.json`、行为 Authority、Owner、能力声明和目录位置均不由本 Skill 修改。
- `--localize-ui` 只组合本 Skill 与 `skills localize-ui` 的既有权限：先以 proposed companion bytes 做统一预检；任一阶段阻断时不写入。它不扩大 completion 或 localization 的单独写入边界。

## 工作流

1. 读取目标 `README.md`、`AGENTS.md` 和适用 OpenSpec，确认目标与写入边界。
2. 先运行 `seshat skills review --target /absolute/project --json`，确认目标 Skill 的来源、分类和现有 Finding；本 Skill 不替代 `seshat-govern-skill-provenance`。
3. 运行 preview：

   ```bash
   seshat skills complete --target /absolute/project --skill <skill-id> --dry-run --json
   ```

   省略 `--skill` 时检查目标中所有已有的 Skill 原子；不安全目录、无有效 `SKILL.md`、重复 ID、路径冲突和 Seshat bundle 都必须进入阻断冲突。
   若本次还要求把 project-owned UI 元数据改为语义化中文，使用组合预览：

   ```bash
   seshat skills complete --target /absolute/project --skill <skill-id> --localize-ui --dry-run --json
   ```

4. 逐项检查 `action=create`、目标路径、`derivedFrom`、SKILL digest、缺失文件前置条件和写入授权。组合预览还必须检查 `phases.completion`、`phases.localization` 与每个 `fieldDiff`；缺失 metadata 可在 `derivationStatus=semantic-localized`、`localizationDisposition=direct-create` 时直接创建最终中文内容，不得先写占位版本。
5. 只在计划无冲突且用户已授权后，去掉 `--dry-run` 应用同一计划：

   ```bash
   seshat skills complete --target /absolute/project --skill <skill-id> --json
   ```

   组合执行保留 `--localize-ui`。若 localization 在预检阶段阻断，命令必须 exit 2 且保持所有 companion bytes 不变；若预检后发生并发或 I/O 异常，结果必须以 `executionState=partial|blocked` 如实列出各阶段，不能宣称完整成功。若 atom 已完整且只需修改 UI，优先直接使用 `skills localize-ui` 或本地 conformance remediation，避免把 companion completion 误选为纯 UI 整改入口。

6. 应用后运行 `seshat skills list`、`seshat skills review`，对非 Seshat Skill 按 Finding 再执行 `skills register --dry-run`；再次执行相同的 standalone 或组合 dry-run 必须返回 `no-changes`。

## 派生内容规则

生成的三个文件只能复述 `SKILL.md` 已有的 Skill ID、入口和 description，并明确标注“未确定/派生自 SKILL.md”。不得编造输入参数、执行步骤、验证通过、Owner、能力、权限或 Runtime 事实。生成文件不是新的行为 Authority；行为始终以 `SKILL.md` 为准。

## 安全与闭环

- discover：`skills complete --dry-run` 只发现已有 `SKILL.md` 和缺失 companions。
- execute：应用计划只原子创建缺失文件，并以 `SKILL.md` digest、缺失路径和目标根真实路径阻止并发/符号链接逃逸。
- execute（组合）：completion 为 `no-changes` 时仍继续 localization；proposed metadata 的 localization update 折叠为一次最终 create。各文件使用原子 create/replace，但跨文件批次不是虚构的全局事务，异常必须返回 partial 真值并停止后续写入。
- verify：结果 Schema、两个 phase、`skills list`、`skills review`、测试和第二次相同 dry-run 验证完整性与幂等性。
- remediate：非 Seshat Skill 完成后仍由 `seshat-govern-skill-provenance` 登记；Seshat bundle 缺失回到 `seshat init`；行为定义缺失必须由 Skill Owner 修复。

本 Skill 不执行 `standardize`，不调用 `skills register` 写 sidecar，不修改 Git 状态，不读取源码、Runtime、用户数据、凭据、日志、缓存或锁。
