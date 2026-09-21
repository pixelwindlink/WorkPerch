---
name: seshat-diagnose-information-governance
description: Diagnose every discovered governed file and directory in an explicit project, keep specification adherence independent from asset type and governance level, and write a Markdown table report with the audit result. Use when a human or Agent needs a reviewable file-by-file governance diagnosis, including cases where a path violates the specification but its asset type and governance level remain identifiable.
---

# Diagnose Project Information Governance

Use the Seshat executable to audit an explicit project and produce a durable Markdown diagnosis. This Skill is a reporting layer over the canonical audit capability; it must not invent a second classification algorithm.

## Execute

1. Resolve a trusted installed Seshat executable or an explicit absolute `bin/seshat.mjs` path.
2. Resolve the exact target project root.
3. Choose an explicit Markdown output path under `artifacts/audit/`; use `artifacts/audit/<run-id>/information-governance-diagnosis.md`.
4. Preview the report without writing:

   ```bash
   seshat diagnose \
     --target /absolute/project \
     --output artifacts/audit/<run-id>/information-governance-diagnosis.md \
     --dry-run --json
   ```

5. Review the plan and apply it only when the destination is absent or identical:

   ```bash
   seshat diagnose \
     --target /absolute/project \
     --output artifacts/audit/<run-id>/information-governance-diagnosis.md \
     --json
   ```

## Required independent dimensions

The Markdown table must contain separate columns for:

1. **规范遵循状态**：whether the path follows the frozen specification at its current location and content boundary. Use `遵循`, `部分遵循`, `不遵循`, `无法判断`, or `不适用（不纳入治理）`.
2. **资产类型**：the provisional primary asset type and its `2.1.2` section reference. Use `未分类` when evidence is insufficient.
3. **治理等级**：`强制治理`, `建议治理`, `不纳入治理`, or `未确定`.

Never collapse these dimensions. A path can be `不遵循` while still being `机器契约 / 2.1.2.11 / 建议治理`; it can be `无法判断` when no type evidence exists; and an out-of-scope source or Runtime path can be `不适用（不纳入治理）` without being treated as a specification violation.

## Report contract

The report must include:

- target root, canon route and audit status;
- a summary that counts specification adherence independently from governance levels;
- one Markdown table row for every classified file or directory returned by audit;
- path, kind, specification adherence, adherence evidence, primary asset type, `assetTypeRef`, `assetTypeStatus`, governance level, path/role conformance, Finding codes, Authority and safe next action;
- a separate Finding table for findings that cannot be attached to one path;
- explicit claims that the report does not verify source correctness, business behavior or Runtime health.

Exclude the report file and its own `artifacts/audit/<run-id>/` storage ancestors from the diagnostic rows so that writing the report does not make the next identical run diagnose itself. This self-exclusion does not hide other pre-existing audit artifacts.

The report is a human-readable persistent artifact. It does not become a new Authority and must not replace the JSON audit result. Keep the source audit JSON separately when durable machine evidence is required.

## Adherence calculation

Derive adherence only from the canonical audit result:

- `遵循`: no path-specific blocking or warning Finding and the classification is deterministic or the path is a confirmed governance boundary;
- `部分遵循`: only informational observations or unresolved path/role conformance remain;
- `不遵循`: a path-specific error, `PATH_ROLE_MISMATCH`, governance collision or frozen content/path drift applies;
- `无法判断`: the asset is persistent and information-shaped but has `assetTypeStatus=unclassified` or unresolved semantic evidence;
- `不适用（不纳入治理）`: the canonical audit classifies it as out of scope.

Do not infer adherence from the asset type name, directory name, file extension, producer identity or a successful JSON Schema validation.

## Write boundary

- Run the canonical `audit` first; do not recurse into source, credentials, user data, raw logs, Crash files, caches, locks or Runtime state.
- Write only the requested `.md` report under `artifacts/audit/`; reject arbitrary output paths.
- Use a plan-first, no-silent-overwrite rule. An existing identical report returns `no-changes`; an existing different report blocks the operation.
- Do not modify the target's README, AGENTS, maps, machine assets or source as part of diagnosis.
- Route actual remediation to `seshat-standardize-information-assets`; route new placement questions to `seshat-consult-asset-placement`.

## Boundaries with related Skills

- `seshat-audit-information-assets` owns evidence collection and canonical Findings.
- This Skill owns only the independent-dimension Markdown presentation and report persistence.
- `seshat-verify-governance-readiness` owns the aggregate delivery verdict, not file-by-file report writing.
- `seshat-persist-governance-evidence` persists JSON evidence; this Skill writes the explicitly requested human-readable Markdown diagnosis.
- `seshat-explain-audit-findings` explains Finding semantics; this Skill only links Finding codes and next actions.
