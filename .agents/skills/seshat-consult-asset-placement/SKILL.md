---
name: seshat-consult-asset-placement
description: Classify a proposed or existing project file by Seshat governance level and primary asset type, then return an Authority-aware placement decision without writing. Use when deciding where README, AGENTS, OpenSpec assets, Skills, manifests, docs, artifacts, generated views, machine contracts, Schema, templates, registries, policies, configuration, metadata, source, Runtime data, logs, or a newly invented AI-assisted asset belongs. Do not use for tracing ownership of an already-known path or applying an explicit migration.
---

# Consult Asset Placement

Return advice only. Never create, move, rename, overwrite or edit the requested asset.

Resolve a trusted Seshat executable from the installed package or an explicit absolute path. If it is unavailable, stop instead of guessing the classification from this Skill text alone.

## Execute

Supply the known semantic identity:

```bash
seshat consult \
  --content-type machine-contract \
  --existing-path src/main/resources/contracts/workflow.json \
  --producer ai \
  --consumer cli \
  --lifecycle persistent \
  --json
```

## Decision order

1. Identify the asset responsibility, primary consumers and declared Authority.
2. Determine one provisional primary asset type and its `2.1.2` section reference.
3. Determine the governance level independently.
4. Resolve Authority, lifecycle and rebuildability; treat missing values as explicit unknowns.
5. Prefer a semantically aligned existing path.
6. Recommend a new path only when the canon provides one.

## Governance consequences

- `强制治理`: return the frozen path or OpenSpec role and its content/Authority obligations.
- `建议治理`: preserve an existing machine-consumer path. When no convention exists, return `machine-assets/<responsibility>/` only as a recommendation. State that Seshat cannot migrate or modify the asset.
- `不纳入治理`: return no path recommendation and route the decision to the source, Runtime or operations owner.
- unknown: return `UNCLASSIFIED_INFORMATION_ASSET`; do not guess a directory.

Every response must expose `governanceLevel`, `assetType`, `assetTypeRef`, `assetTypeStatus`, semantic-action candidates and missing evidence, `assetRoles`, path/role expectations and conformance, `pathRuleId`, `pathRuleSource`, `authority`, `consumers`, `lifecycle`, rebuildability and a safe next action. The 20 current primary semantic asset types use `assetTypeStatus=provisional` across 21 classification chapters; `2.1.2.18 Sample` is only a cross-type role. Source and Runtime boundaries use `not-applicable`; unknown assets use `unclassified`.

Producer identity never affects placement. AI, Developer, Skill, CLI, API, MCP and generators are producers or consumers, not top-level directory classes.

Do not treat `path-rules.json` as a target-project file, universal content-type alias or separate primary asset type. It is a Seshat-internal Policy instance (`2.1.2.15`, `dominantSemanticAction=decide`) whose implementation path remains governed by Seshat's own OpenSpec decision; never recommend or install it merely because a project adopts Seshat.

Use only unambiguous content-type identifiers: `machine-contract` versus `openspec-contract`, `machine-manifest` versus `navigation-manifest` (or `skill-manifest`, `cli-manifest`, `api-manifest`, `mcp-manifest`), and `static-config` only after the specific-type exclusions are satisfied. Bare `contract`, `manifest` and `config` are unresolved and must not receive a guessed path.
