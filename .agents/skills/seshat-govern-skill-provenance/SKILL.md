---
name: seshat-govern-skill-provenance
description: "Classify, review and register every added, copied, AI-generated, installed, upgraded, enabled, deprecated, shared or published Skill with one project-relative skillClass: public, inner, private or outside. Use before a Skill lifecycle or exposure change, after behavior remediation, when migrating legacy 1.0/1.1 sidecars, or when validating ownership, source, digest, private consumers and capability overlap. This is the required provenance companion to skill-creator and conformance remediation; it does not install Skills, edit behavior, add companions or standardize paths."
---

# Govern Skill Classification and Provenance

Use the installed Seshat CLI as executable Authority. Keep `SKILL.md` as behavior Authority and use the governance sidecar only for the current project's classification and direct evidence.

## Classification

Treat `skillClass` as the only project-relative classification field:

- `public`: the current project provides this capability externally;
- `inner`: the current project uses this capability for itself;
- `private`: private implementation used only by declared current-project `public` Skills;
- `outside`: another project or third party supplies this capability and the current project installs it for use.

Do not add `authorityOrigin`, `ownership`, `operatingScope` or `primaryConsumer` to 2.0 records or outputs. Do not infer class from exposure, name, path, README wording or the fact that AI created a file.

Apply these invariants:

- `outside` requires an external source kind and non-empty source locator;
- `private` requires one or more installed `public` consumers in `consumedBy`;
- an outside Skill cannot be relabeled as the current project's `public` capability;
- when the project intentionally exposes behavior built on an outside Skill, create a current-project `public` wrapper and keep the dependency `outside`;
- an exact Seshat bundled Skill is `outside` in every consuming project, while Seshat's own repository retains its bundled `public`/`inner`/`private` declarations.

## Mandatory workflow

1. Resolve the absolute target project and Skill ID.
2. Discover and review without writing:

   ```bash
   seshat skills list --target /absolute/project --json
   seshat skills review --target /absolute/project --json
   ```

3. For a non-bundled Skill, prepare a `schemaVersion=2.0` record. Keep `skillId` and `skillClass` as peer root fields and include source, Owner, namespace, behavior Authority, digest, capabilities, lifecycle, exposure, `consumedBy`, approval and license evidence as applicable.
4. Preview the exact sidecar write:

   ```bash
   seshat skills register --target /absolute/project \
     --skill <skill-id> --input /absolute/record.json --dry-run --json
   ```

5. Apply only after checking the sidecar path, class, behavior digest and write preconditions.
6. Rerun `skills review` and `seshat verify --target /absolute/project --json`.

## Legacy migration

Treat 1.0 and 1.1 sidecars as review-only evidence. A `SKILL_CLASSIFICATION_V2_MIGRATION_REQUIRED` Finding supplies a suggested class but never rewrites the record. Create an explicit 2.0 input, remove the deleted fields, preview with `skills register --dry-run`, apply with unchanged behavior bytes, then verify again.

## Contract closure

- Discover: this Skill plus `skills list` and `skills review` expose the class and Findings.
- Execute: `skills register` plans and writes only the governance sidecar.
- Verify: packaged Schema, review, readiness and tests validate the four classes and direct evidence.
- Remediate: migrate a sidecar explicitly, repair a bundled declaration through an OpenSpec Change, or add a current-project `public` wrapper without editing outside behavior Authority.

Stop when the CLI or packaged Schema is unavailable, the target path escapes the project, a precondition is stale, a bundled atom differs, or resolving overlap requires an Owner decision.
