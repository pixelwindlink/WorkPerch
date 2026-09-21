---
name: seshat-validate-governance-results
description: Validate an existing Seshat JSON result against its packaged structural Schema without rerunning the source command, inspecting the target project, recomputing Findings, or modifying the input. Use when accepting external Seshat output, checking evidence before persistence, diagnosing malformed result JSON, or verifying that a result's serialized Contract is compatible with the installed Seshat version.
---

# Validate Governance Results

Validate the serialized result, not the target project. This Skill protects the boundary between a result's structural Contract and the source command's governance meaning.

## Execute

```bash
seshat results validate --input /absolute/results/audit.json --json
```

If command inference is ambiguous, select an explicit packaged Schema:

```bash
seshat results validate \
  --input /absolute/results/result.json \
  --schema audit-result.schema.json \
  --json
```

## Decision rules

1. Read only the supplied JSON and the installed packaged Schema.
2. Require `schemaVersion`, the source `command`, and the command-specific required shape.
3. Reject unknown commands or Schemas; do not treat arbitrary JSON as Seshat evidence.
4. Keep the source command's claims intact. A `valid` result means structural compatibility only; it does not mean current compliance.
5. Keep structural validation separate from evidence admissibility. Applied `init`/`standardize` output can satisfy its Schema, while evidence persistence must still reject it as a mutating source.

## Responsibility boundary

- Do not run audit, verify, review, consult, standardize or any source command.
- Do not inspect the target path named inside the result.
- Do not edit, normalize, reserialize or repair the input JSON.
- Do not persist evidence; route a structurally valid result to `seshat-persist-governance-evidence`.
- Do not compare history; route two valid same-command results to `seshat-compare-governance-baselines`.

The result Schema is a structural Contract. Authority, freshness, target facts and the truth of Findings remain owned by the source command and its requirements baseline.
