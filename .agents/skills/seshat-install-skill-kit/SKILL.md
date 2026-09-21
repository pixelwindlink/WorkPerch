---
name: seshat-install-skill-kit
description: Bootstrap, install, upgrade or restore the canonical Seshat Skill Kit and mandatory governance foundation in an explicit target project. Use for first adoption, when connecting a trusted Seshat checkout or installed CLI to an external Agent, when bundled Skills or governance entries are missing, after the Provider is updated, or when an interrupted lifecycle operation needs receipt/journal recovery. Start from a trusted `seshat` executable or Provider root because a pre-install Agent cannot discover this project-local Skill. Validate the exact Provider inventory and preserve target-owned bytes through receipt-backed three-way checks. Do not use for compatibility-only checks, target-wide assurance, semantic Skill remediation or editing outside/project-owned behavior.
---

# Install Seshat Skill Kit

Use the Seshat CLI as the executable installer Authority. Do not copy the Seshat requirements canon into an external project. A cloned Provider checkout is sufficient today; a future installed `seshat` package is equally valid. No Git remote or network access is required.

Resolve a trusted Seshat executable first: use `seshat` from the installed package, `SESHAT_PROVIDER_ROOT`, or an explicit absolute path to `bin/seshat.mjs`. If neither is available, stop with `provider-unresolved`; do not reconstruct installation with ad hoc file copies or search arbitrary sibling directories.

## Choose the profile

`--profile` decides which canonical Skills are installed, and therefore which capabilities the target's responsibility Agent can ever discover. An absent Skill is never retrieved and never triggered; that capability stays reachable only through an explicit CLI command somebody already knows to run.

- Use `full` for ordinary adoption. It installs the complete canonical set and is the default when `--profile` is omitted.
- Use `core` only for a deliberately reduced capability set or a constrained Agent that cannot carry the complete set. A non-`full` installation reports `SKILL_KIT_PARTIAL_PROFILE` and keeps an open Owner decision until the reduced scope is explicitly accepted.
- Use `custom` only with explicit `--skill-id` selections the Owner has reviewed.

Never substitute `core` for `full` when the project is expected to follow the complete Seshat governance framework.

## Execute

1. Resolve and confirm the exact absolute target root.
2. Verify the exact selected Provider before any install plan, then preview:

   ```bash
   seshat compatibility check --target /absolute/project --provider-root /absolute/seshat --json
   seshat bootstrap --target /absolute/project --provider-root /absolute/seshat --profile full --dry-run --json
   ```

3. Require a complete, byte-bound Provider inventory: exact canonical Skill IDs, each atom's files, executable, required Schemas, Provider version/Node range and per-file digest. Verify every operation reports governance level, provisional asset type and section reference, Authority, consumers, lifecycle, path-rule source, write authorization, safe next action and precondition. Accept only `mandatory-governance`, `openspec-bootstrap-exception`, `canonical-skill-metadata-bundle` or `seshat-kit-receipt` authorization.
4. Reject overwrite conflicts, unknown ownership, source/Runtime writes and any attempted normalization of advisory machine assets.
5. Apply only after authorization:

   ```bash
   seshat bootstrap --target /absolute/project --provider-root /absolute/seshat --json
   ```

6. Run `seshat skills list --target /absolute/project --json`, audit the target, and immediately repeat the same bootstrap/init dry-run. Equivalent receipt objects must converge to `no-changes` regardless of JSON key order or allowed volatile timestamps.

## Post-install assurance

After bootstrap/init, route the external Agent to the installed assurance Skill instead of requiring the Owner to compose every lower-level command:

```text
seshat compatibility check --target <abs> --provider-root <seshat-provider> --json
seshat bootstrap --target <abs> --provider-root <seshat-provider> --dry-run → apply
seshat assure --target <abs> --review --json
seshat assure --target <abs> --dry-run --json
seshat assure --target <abs> --apply --json（仅在明确授权后）
  → 第二次 assurance 为 no-changes/verified，或只留下明确 Owner/outside route
seshat verify --target <abs> --scope root-only --json
```

Assurance 仍会使用 `skills review/register/localize-ui`、standardize 和 remediation 的既有边界。它不会替 Owner 猜 `skillClass`、Authority、outside fork/license 或公开暴露，也不会把静态 Skill 对齐宣称成真实 forward test。

For a later Provider checkout/package update, use the explicit upgrade path:

```bash
seshat upgrade --target <abs> --provider-root <seshat-provider> --dry-run --json
seshat upgrade --target <abs> --provider-root <seshat-provider> --json
seshat upgrade --target <abs> --provider-root <seshat-provider> --dry-run --json
```

Upgrade uses `project-governance/seshat-kit-lock.json` and compares the previous receipt, current target bytes and current Provider bytes. It updates only unchanged Provider-managed files, restores missing files, reports local modifications as conflicts and never silently overwrites them. Every resource remains a Buffer through apply and is re-read after atomic replacement to verify the planned digest. `--prune` is opt-in and only removes retired files whose bytes still match the receipt. `--allow-downgrade` is required for a lower Provider version under strict SemVer precedence. If no receipt exists, upgrade is blocked and init/bootstrap must first establish an adoption baseline without overwriting unrecorded atoms.

Lifecycle apply checkpoints each verified mutation. If a later digest/device/inode precondition or receipt transition fails after earlier writes, accept only a Schema-valid `partial` result with exact completed, pending and blocked operations plus a forward recovery action; never reinterpret a blocked sub-result as top-level `applied` or roll back by overwriting newer Owner bytes.

The Provider inventory covers each canonical atom's four base files plus recursively routed `references/`, `scripts/` and `assets/`. Copy and upgrade those resources byte-for-byte so binary assets are never coerced through UTF-8. Treat unknown files inside a Provider Skill or simultaneous `agents/openai.yml` and `agents/openai.yaml` as an invalid Provider bundle rather than silently omitting one.

`seshat init --upgrade` is a compatibility alias for the same upgrade planner; it does not create a second upgrade algorithm.

Monorepo 治理根必须使用 `--scope root-only`；nested 工程 Skill 不得迁入根 `.agents/skills/`。

## Installed surface

- root README and AGENTS entries;
- OpenSpec workspace directories and configuration;
- all canonical Seshat Skill atoms from the trusted Provider bundle;
- project file map and applicable Skill/CLI navigation manifests;
- `.agents/skills/index.html` human Skills inventory page when canonical Skills exist;
- docs namespace without fabricated knowledge documents.

The installer may create missing `openspec/config.yaml` only when the whole OpenSpec workspace is absent. It must preserve an existing workspace and configuration. It may copy the bundled Seshat `agents/openai.yml` only as part of the same versioned Seshat Skill atom; a differing existing file blocks installation instead of being overwritten. Live discovery must also accept a project-owned atom whose existing metadata path is `agents/openai.yaml`, without renaming or duplicating it.

Create missing README/AGENTS with explicit unknown values instead of invented project facts. Preserve existing entries and block conflicts. Keep each Skill atom complete: `SKILL.md`, `MANUAL.zh-CN.md`, `PROMPT.zh-CN.md`, and exactly one existing metadata path at `agents/openai.yml` or `agents/openai.yaml`. Seshat's own bundle continues to distribute `agents/openai.yml`. A differing existing atom is an upgrade/ownership conflict for ordinary init; the explicit upgrade command may replace it only when the receipt proves the target was not locally modified.

Do not install a generic `path-rules.json`, `machine-assets/`, artifacts or generated directory merely for completeness. Do not touch existing machine contracts, Schema, templates, registries, policies, configuration, source, tests, business implementation, Runtime data, user data, logs, Crash files, caches or locks.
