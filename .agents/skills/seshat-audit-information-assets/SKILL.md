---
name: seshat-audit-information-assets
description: Perform a read-only Seshat audit that classifies project files by governance level and primary asset type, validates mandatory governance paths/content, reports advisory machine-asset navigation without modifying it, and excludes source/runtime data. Use when checking README, AGENTS, OpenSpec, Skills, manifests, docs, artifacts, generated views, machine contracts, Schema, templates, registries, policies, static configuration, unclassified information assets, Authority conflicts, or Seshat compliance. Do not use for changed-path-only Git review, a persistent Markdown diagnosis, provider compatibility checks, or applying a standardization/remediation plan.
---

# Audit Project Information Assets

Treat the installed Seshat canon as the upper requirements baseline. Inspect and report; never write the target.

Resolve a trusted Seshat executable from the installed package or an explicit absolute path. If it is unavailable, stop instead of recreating audit logic in ad hoc shell commands.

## Execute

1. Resolve an explicit absolute target root.
2. Run:

   ```bash
   seshat audit --target /absolute/project --json
   ```

3. Preserve the returned evidence and explain each finding without applying a fix.

## Classify before judging

For every relevant path, keep two dimensions separate:

- governance level: `强制治理` / `建议治理` / `不纳入治理`;
- provisional primary asset type: README, AGENTS, HANDOFF, OpenSpec, Skill, project map, navigation manifest, docs, persistent artifact, generated view, machine contract, Schema, Template, Registry, Policy, machine Manifest, Preset, static configuration, metadata, or asset namespace. Record Sample only in `assetRoles`, never as a primary type.

Do not infer either dimension from basename, extension, producer, or the presence of AI. A file has one primary asset type; auxiliary features do not create another Authority.

Every classified governed path must report `assetType`, `assetTypeRef`, `assetTypeStatus=provisional`, `governanceLevel`, `pathRuleId`, `pathRuleSource`, `authority`, `consumers`, `lifecycle` and the safe next action. Out-of-scope paths use `assetTypeStatus=not-applicable` and no `2.1.2` type. Do not expose the internal `assetTypeId` as a frozen cross-project enum.

## Audit behavior

- For `强制治理`, inspect existence, frozen path, declared content contract, Authority routing, lifecycle and conflicts.
- For `建议治理`, identify the asset, existing path, consumer and Authority route. Findings are advisory; do not propose automatic migration, rename, overwrite or content normalization.
- For `不纳入治理`, do not inspect contents or recommend a path. Only state the boundary when needed to explain why Seshat stops.
- Report an unknown persistent information-shaped file as `UNCLASSIFIED_INFORMATION_ASSET` and block only writes that depend on its unresolved classification.
- Report machine Authority conflicts separately from governance Authority conflicts.

## Required evidence boundaries

Separate path coverage from content conformance. Separate design declarations, Contract facts, code facts and Runtime facts. README or generated text never proves executable behavior or Runtime health.

Do not recursively read credentials, user data, raw logs, Crash files, caches, locks or Runtime state. Do not create an audit file inside the target; the caller may separately persist stdout under an authorized artifact path.
