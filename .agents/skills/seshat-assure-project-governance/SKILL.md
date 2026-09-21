---
name: seshat-assure-project-governance
description: Converge Seshat governance for an explicit project by discovering, classifying, planning, applying authorized project-owned fixes, registering evidence and verifying a second no-changes pass. Use after bootstrap or upgrade; after README, AGENTS, OpenSpec, Skill, navigation or provenance changes; when audit, lint, review or verify needs end-to-end remediation; or to resume an interrupted assurance journal. Review and dry-run remain read-only; apply preserves outside and bundled behavior Authorities and leaves only genuine Owner decisions. Do not use to guess business intent, choose an Authority winner, edit outside Skills in place, or claim runtime or automatic triggering without evidence.
---

# Assure Project Governance

Use this Skill as the top-level governance loop for an explicit absolute project path. It composes Seshat capabilities; it does not replace audit, the shared platform-neutral Agent Skill evaluator, remediation, provenance, standardize or verify.

## Select intent

- **Review**: for “审查、看看、分析、给建议、是否 ready”. Run read-only assurance and return findings, deterministic operations, routes and the Owner queue. Do not write.
- **Dry-run**: for “预览、计划、准备整改”. Produce the same complete plan with write preconditions and no target writes.
- **Apply**: only for explicit “整改、修复、规范化、对齐、直接处理” authorization. Apply only the plan's safe operations, journal every checkpoint, then rerun assurance.
- If intent is ambiguous, choose review.

## Core workflow

1. Resolve the target to an absolute directory. Read its README, AGENTS, applicable OpenSpec and current Seshat receipt before interpreting findings.
2. Run the unified entry point:

   ```bash
   seshat assure --target /absolute/project --review --json
   seshat assure --target /absolute/project --dry-run --json
   seshat assure --target /absolute/project --apply --json
   ```

3. Read `operations`, `findings`, `gating`, `ownerDecisionQueue`, `evidence` and `claims` together. `remediationAllowed=true` never implies enablement or readiness.
4. In apply mode, preserve the journal at `project-governance/assurance/journal.json`. If it is in progress, retry only through the same command and current digest evidence; never overwrite newer content or use reset/restore. Treat `partial` as a real terminal state for the current attempt: report completed/pending/blocked operations and resume forward only after their byte preconditions are revalidated.
5. Route semantic Skill findings to `$seshat-remediate-skill-conformance`; route classification, source, digest and exposure to `$seshat-govern-skill-provenance`; route only missing companions to `$seshat-complete-skill-atom`; route unambiguous navigation/path fixes to `$seshat-standardize-information-assets`.
6. For outside Skills choose upgrade, upstream repair, project-owned wrapper, explicit fork, disablement or removal. For bundled Seshat Skills return to the Seshat Provider and refresh with bootstrap/upgrade; do not edit the installed copy in place.
7. Run the second assurance pass. Treat `no-changes`/`verified` as convergence only when no deterministic operations remain. Keep `automaticTriggerVerified=false` when forward-test evidence is absent or unsupported.
8. Run `seshat verify --target /absolute/project --json` for the final governance-readiness verdict. Report runtime, source, business and model-trigger claims separately.

## Safety boundaries

- Never invent project identity, architecture, capabilities, Owner, Authority, license or business intent.
- Never edit source, runtime state, credentials, logs, user data or project-native implementation directories.
- Never let Manual, Prompt, Manifest, HTML, receipt or sidecar become Skill behavior Authority; `SKILL.md` remains authoritative.
- Never auto-select an Owner decision about authority collisions, deletions, downgrades, public exposure, outside fork/license or unclear behavior.
- A non-aligned Skill is a remediation input: it may be audited, linted, reviewed and safely remediated, but formal enabled/public/readiness claims stay blocked until the required gates pass.

## Direct references

- For route taxonomy, journal fields, recovery rules and claim boundaries, read [assurance-contract.md](references/assurance-contract.md).
- For a compact command and evidence checklist, read [assurance-checklist.md](references/assurance-checklist.md).
