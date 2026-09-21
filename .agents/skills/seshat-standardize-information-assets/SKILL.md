---
name: seshat-standardize-information-assets
description: Apply a reviewed, idempotent Seshat standardization plan to mandatory project information assets while preserving advisory machine-consumed assets and excluding source/runtime data. Use when aligning README, AGENTS, OpenSpec roles, project maps, navigation manifests, docs or declared artifact/generated boundaries, including safe legacy AGENT migration and explicit Authority path migration. Do not use to rewrite Skill trigger descriptions, neighboring boundaries, references, scripts, assets or UI semantics; route those changes to seshat-remediate-skill-conformance, and use audit for read-only discovery.
---

# Standardize Project Information Assets

Standardize only `强制治理` assets. Treat `建议治理` machine assets as read-only project-owned Contracts and `不纳入治理` files as outside the operation.

Resolve a trusted Seshat executable from the installed package or an explicit absolute path. Never reproduce the write plan manually when the executable or its result Schema is unavailable.

## Execute

1. Resolve the exact absolute target root.
2. Preview:

   ```bash
   seshat standardize --target /absolute/project --scope root-only --dry-run --json
   ```

3. Review every operation's `governanceLevel`, `assetType`, `assetTypeRef`, `assetTypeStatus`, `pathRuleId`, `pathRuleSource`, Authority, consumers, lifecycle, write authorization, safe next action, reason and precondition.
4. Stop on unresolved governance Authority, path collision, ambiguous README structure, concurrent change, path escape or an operation aimed at a non-mandatory asset.
5. Apply only after authorization:

   ```bash
   seshat standardize --target /absolute/project --json
   ```

6. Rerun the dry-run and require `no-changes`.
7. If `navigationQuality.uiPendingCount > 0`, `claims.semanticUiValid === false`, or status is `ready-with-gaps`, run `seshat skills localize-ui` and **review every fieldDiff.after** before apply. **`navigationQuality.complete === true` alone does not prove index.html is human-readable.**

## Post-standardize checklist

| 检查项 | 命令 | 通过条件 |
|---|---|---|
| UI 中文化 | `skills localize-ui --dry-run --json` | `status: ready` 且每个 fieldDiff.after 不含「中文说明书」「\\| 项目 \\| 内容 \\|」 |
| 消费者声明 | `skills review --json` | public/inner 无 `SKILL_CONSUMER_SURFACE_UNDECLARED` 或 Owner 显式 skip |
| 导航幂等 | `standardize --scope root-only --dry-run` | `no-changes` |
| 导航质量 | `standardize --dry-run --json` | `navigationQuality.complete === true` **且** `claims.semanticUiValid !== false`；仍需 spot-check index.html |
| 就绪验证 | `verify --scope root-only --json` | `postStandardizeChecklist` 全 true |

## Mandatory behavior

- Create missing README/AGENTS with explicit `未确定` facts instead of invented identity or capability claims.
- Preserve existing README section bodies while arranging only unambiguous required sections in the frozen order.
- Preserve the two God Rules exactly.
- Maintain repository-bound maps/manifests, README/AGENTS, docs and OpenSpec roles. Canonical Skill atom installation or version upgrade remains the installer responsibility; standardization only refreshes their navigation.
- When canonical Skills exist, regenerate `.agents/skills/index.html` using the grouped Skills inventory UI (class summary, grouped tables, skillClass/capabilities/被谁使用 columns). The page is Seshat-managed navigation only and does not replace any `SKILL.md`. Invalid UI metadata must not leak English `default_prompt` into the Chinese example column.
- Treat `--scope root-only` as the default standardize boundary. Never apply `migrate-skill` when the source path lives under declared nested-project prefixes such as `engine_projects/`, `common_components/`, or `conformance/`. Stop even if the overall plan otherwise looks ready.
- When `ownerDecisions[]` or `claims.crossProjectMigrationPlanned=true` appears, stop and route the Owner through the decision form instead of force-applying or manually moving Skills.
- Do not create optional HANDOFF, artifacts or generated paths without their trigger condition.

## Never write

Do not move, rename, overwrite or modify machine contracts, Schema, Template, Registry, Policy, machine Manifest, Preset, static configuration or metadata because their actual paths/content belong to program-consumer Contracts. A Sample role remains attached to its demonstrated type and grants no extra write permission. Do not touch source, scripts, tests, business implementation, Runtime state, user data, raw logs, Crash files, caches or locks.

An explicit Authority migration requires `source=destination`, an Authority marker, a safe mandatory-governance source, a missing destination and unchanged preflight hashes. Never infer migration from basename or recency.
