---
name: seshat-plan-authority-migration
description: Preview one explicit, source-to-destination Authority path migration for mandatory governance assets without applying standardization, inferring paths, choosing an Authority winner, or modifying the target. Use when an audit identifies unambiguous path drift, when reviewing AGENT.md to AGENTS.md compatibility migration, or when an OpenSpec Change needs a bounded migration plan and preconditions.
---

# Plan Authority Migration

Build a read-only migration plan for a relation the caller has explicitly supplied. The Skill verifies source existence, destination absence, safe governance boundary, Authority marker and source hash; it never invents a source or destination.

## Execute

```bash
seshat migration plan \
  --target /absolute/project \
  --migrate-authority architecture/runtime.md=openspec/architecture/runtime.md \
  --json
```

Review the returned source, destination, Authority evidence, expected hash, write authorization and conflicts. Apply only through the separately reviewed `seshat-standardize-information-assets` plan.

## Decision rules

- Accept exactly one explicit `source=destination` relation per plan.
- Require an existing source file, a missing destination, and a readable Authority marker. The frozen root `AGENT.md=AGENTS.md` compatibility migration is the only controlled exception; its identity is established by the legacy-entry rule and it may add only the two God Rule acknowledgments.
- Allow only mandatory-governance Authority paths; reject source, resources, business, Runtime and machine-consumer paths.
- Treat path drift as a plan candidate, not proof that migration is semantically safe.
- Rebuild the plan immediately before any write; the source hash and destination absence are preconditions.

## Responsibility boundary

- Do not audit the entire project or decide whether migration is desirable.
- Do not choose between duplicate Authorities, infer a path from basename, or migrate advisory machine assets.
- Do not create directories, move files, delete legacy files or update maps/manifests.
- Do not replace `seshat-standardize-information-assets`, which owns the final write plan and atomic application.

An approved plan preserves the source semantics but does not itself establish that the destination is the winning Authority; that decision remains with the requirements/OpenSpec owner.
