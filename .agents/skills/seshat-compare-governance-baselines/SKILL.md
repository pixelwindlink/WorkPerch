---
name: seshat-compare-governance-baselines
description: Compare two existing same-command Seshat JSON results for the same target and report status, Finding-code and governance-summary changes without rescanning the project or modifying either result. Use when reviewing governance evolution between audits, readiness checks, change reviews or other repeatable Seshat evidence before claiming improvement, regression or unchanged state.
---

# Compare Governance Baselines

Compare historical evidence only. A comparison is not a current audit and does not prove that the newer result is correct.

## Execute

```bash
seshat compare baselines \
  --before /absolute/evidence/before.json \
  --after /absolute/evidence/after.json \
  --json
```

Return source paths, commands, targets, status transition, added/removed/unchanged Finding codes, governance-summary change and a safe next action.

## Comparability rules

- Require both files to be JSON Seshat result objects with `schemaVersion` and `command`.
- Require the same Seshat command so status and evidence fields have compatible semantics.
- Require the same target identity when both results declare one.
- Block mismatched commands or targets instead of constructing a false evolution narrative.

## Responsibility boundary

- Do not inspect or modify the target project.
- Do not rerun audit, verify, review or standardization.
- Do not compare file contents, source behavior, Runtime state or business outcomes.
- Do not rank an added/removed Finding as improvement or regression without reading the applicable Authority and original evidence.
- Use `seshat-persist-governance-evidence` separately when the comparison result needs durable retention.

Before making a current compliance claim, rerun the applicable source command against the current target.
