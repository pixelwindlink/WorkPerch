---
name: seshat-persist-governance-evidence
description: Persist an already generated target-bound read-only Seshat JSON result or init/standardize dry-run as immutable governance evidence under an explicit artifacts class using a reviewed no-overwrite plan. Use when retaining audit, readiness, Authority trace, change-review, compatibility, baseline-comparison or migration-plan evidence for history, handoff or OpenSpec verification without rerunning the source command or modifying project facts.
---

# Persist Governance Evidence

Persist only completed Seshat result JSON. Do not use this Skill as a generic file copier or as a substitute for running the source command.

## Execute

1. Resolve an explicit target, input file, evidence class and optional stable id.
2. Preview:

   ```bash
   seshat evidence persist \
     --target /absolute/project \
     --input /absolute/results/audit.json \
     --class audit \
     --id review-2026-08-20 \
     --dry-run \
     --json
   ```

3. Verify the source command is read-only, or is an `init`/`standardize` dry-run; verify its claims do not report target mutation.
4. Verify the command-to-artifact-class mapping, destination, SHA-256 digest and no-overwrite precondition.
5. Apply by rerunning without `--dry-run`; rerun the same command and require `no-changes`.
6. Run `seshat standardize --target /absolute/project --dry-run --json`; if the new `artifacts/` root makes a Seshat-managed external project map stale, review and apply only that navigation refresh.

## Responsibility boundary

- Write only `artifacts/<class>/<id>/<result>.json` selected by the plan.
- Never overwrite differing persistent evidence; use a new id or resolve ownership explicitly.
- Do not inspect the source project, rerun audit, reinterpret Findings, choose an Authority winner or modify the evidence payload.
- Do not accept applied write results, arbitrary JSON, source files, logs, credentials, Runtime state or user data as governance evidence.
- Treat the JSON file as a program-consumed advisory asset inside a persistent-artifact lifecycle namespace; this producer authorization does not expand standardization permissions.

After persistence, refresh only the Seshat-managed external navigation map when needed, then reference the immutable artifact from the relevant review, handoff or OpenSpec verification record; the artifact does not become a new requirements Authority.
