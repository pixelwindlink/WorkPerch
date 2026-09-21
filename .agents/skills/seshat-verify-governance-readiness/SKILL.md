---
name: seshat-verify-governance-readiness
description: Verify without writing whether an explicitly targeted project is ready for information-governance handoff by composing Seshat audit, standardization dry-run, live canonical Skill discovery, Contract closure and assurance journal/Owner-queue evidence. Use after installation and remediation have finished, before external delivery, when checking whether the target is compliant and idempotent, or when a user asks only for a final governance-readiness verdict. Do not use when the user wants findings fixed, an interrupted run recovered or the project converged; use seshat-assure-project-governance for that. This verdict must not imply automatic-trigger, source, business or Runtime validation without evidence.
---

# Verify Governance Readiness

Return a read-only release-style verdict. Do not apply remediation.

## Execute

1. Resolve a trusted Seshat executable from the installed package or an explicit absolute path.
2. Resolve the exact target root.
3. Run:

   ```bash
   seshat verify --target /absolute/project --json
   ```

4. Preserve the complete evidence and explain the verdict.

## Verdict contract

- `ready`: audit is compliant, standardization dry-run is `no-changes`, every discovered canonical Skill atom is complete, Contracts are closed, and no assurance journal/Owner queue blocks handoff.
- `needs-attention`: no blocking conflict exists, but findings, planned writes or incomplete Skills remain.
- `blocked`: audit or standardization reports a blocking Authority/path conflict.

The result must include audit status, standardization dry-run status, Skill counts, Contract closure, assurance evidence, finding codes, planned paths, safe next action and explicit read-only claims.

## Responsibility boundary

Do not rerun business tests, inspect Runtime state, apply standardization, choose an Authority winner or create a handoff file. Route any required convergence to `seshat-assure-project-governance`; keep specialized findings on their existing audit, remediation, provenance, install or standardize routes. A `ready` result proves only project information-governance readiness.

If the Seshat executable or result Schema is unavailable, stop; do not reproduce the orchestration manually.
