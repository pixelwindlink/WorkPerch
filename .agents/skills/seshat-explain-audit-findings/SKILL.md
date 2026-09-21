---
name: seshat-explain-audit-findings
description: Explain the governance meaning, affected-write blocking scope, responsible owner and safe next action for a Seshat audit Finding code without rerunning audit, choosing asset placement or writing files. Use when interpreting codes such as SEMANTIC_AMBIGUITY, MACHINE_AUTHORITY_CONFLICT, GOVERNANCE_PATH_COLLISION, UNCLASSIFIED_INFORMATION_ASSET, stale-map findings or God Rule conflicts before selecting a remediation Skill.
---

# Explain Audit Findings

Explain one Finding code from its catalogued governance semantics. Do not treat the code name alone as evidence about a project.

## Execute

```bash
seshat findings explain --code SEMANTIC_AMBIGUITY --json
```

Return the code, category, whether it blocks affected writes, responsible owner, meaning and safe next action.

## Responsibility boundary

- Do not rerun audit or inspect a target.
- Do not recommend an asset path; use placement consultation for that decision.
- Do not apply standardization or migration.
- Do not claim an unknown code is safe. Return `unknown`, keep affected writes blocked and route the caller to the original evidence and requirements Authority.

The explanation supplements the original Finding; it never replaces its evidence path, details or applicable OpenSpec Authority.
