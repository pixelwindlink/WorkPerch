---
name: operate-perch
description: Safely inspect, check, test, start, call, and diagnose WorkPerch while preserving its single-writer state ownership. Use when operating the Perch Server, CLI, Web UI, EngineMessage endpoint, temporary runtime, project launcher catalog, or root black-box conformance without opening the same state as competing writers.
---

# Operate WorkPerch

Preserve Perch's EngineMessage boundary and one state owner.

## Workflow

1. Locate the Perch Root by finding `engine.manifest.json` with `id=perch`; do not rely on Skill directory depth.
2. Read `AGENT.md`, `README.md`, the manifest and [references/operations-contract.md](references/operations-contract.md).
3. Inspect `git status --short` and current OpenSpec Changes. Preserve unrelated work.
4. Run `npm run check`, the narrowest tests, `npm test` and local OpenSpec validation before startup diagnostics.
5. For Server operation, require an explicit absolute `PERCH_RUNTIME_DIR` unless the user intentionally uses the documented local default.
6. When a Server owns state, call it with Server Client CLI. Use Standalone Exclusive only against a different explicitly isolated absolute runtime root.
7. Use root conformance for public CLI evidence; do not inspect private state to force a pass.

## Safety

- Never delete `.perch-owner.lock` to bypass `STATE_OWNERSHIP_CONFLICT`.
- Never execute saved project commands; they are inert catalog data.
- Never write user state into source, tests or Git.
- Keep CLI stdout to one EngineMessage and diagnostics on stderr.

## Report

Return mode, runtime owner/root, commands and exits, tested layers, EngineMessage response evidence, state/probe errors and whether root conformance executed or skipped the Engine.
