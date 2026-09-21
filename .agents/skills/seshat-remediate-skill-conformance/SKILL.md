---
name: seshat-remediate-skill-conformance
description: Review or repair project-owned Skills for platform-neutral Agent/OpenSpec-style discovery, natural-language triggering, neighboring-Skill boundaries and progressive disclosure. Use after `skill-creator` creates or materially changes a Skill, when audit/lint/review reports conformance Findings, or when SKILL.md, routed resources or UI semantics drift. Review intent returns an actionable plan; apply intent edits only authorized project-owned behavior and verifies it. Route outside or bundled behavior to upgrade, upstream repair, wrapper or explicit fork, then use seshat-govern-skill-provenance after behavior changes. Do not use only to add missing companions or perform path-only standardization.
---

# Remediate Skill Conformance

Use the target Skill's `SKILL.md` as behavior Authority. Preserve its confirmed business purpose while repairing discovery, trigger boundaries and progressive disclosure.

## Select the execution intent

- Treat review, analysis, advice and “tell me how to change it” requests as read-only.
- Treat fix, modify, remediate, normalize, align and equivalent requests as apply authorization only when the target and write scope are clear.
- Keep ambiguous requests read-only.

## Establish the boundary

1. Resolve the absolute project root and target Skill IDs.
2. Read the project README, AGENTS, applicable OpenSpec and each target `SKILL.md`.
3. Record the initial Git status, target diff and behavior digest without cleaning, resetting or overwriting unrelated changes.
4. Run `seshat skills list`, `seshat skills review`, `seshat audit` and `seshat skills lint --profile agent-discoverable-skill/core/v1` against the explicit target.
5. Confirm `skillClass`, source and Owner before proposing writes.
6. Apply platform `skill-creator` principles when that Skill is available; report its absence instead of claiming composition.

## Review mode

Return per-Skill Findings, evidence, ownership decision and a per-file plan. Do not edit files, register provenance or claim that static compatibility proves actual Agent selection.

## Apply mode for project-owned Skills

For authorized `public`, `inner` or `private` Skills:

1. Infer changes only from confirmed behavior Authority and reviewed project context.
2. Plan renames separately because they affect directory identity, `$skill-id`, AGENTS, prompts, manifests, wrappers and consumers.
3. Edit only authorized `SKILL.md`, references, scripts, assets, UI metadata and trigger fixtures.
4. Keep all selection-critical “when to use” information in frontmatter `description`.
5. Keep the core workflow in `SKILL.md`; route detailed knowledge, deterministic operations and output resources directly to `references/`, `scripts/` and `assets/` only when needed.
6. Rerun lint and relevant tests, then synchronize UI metadata.
7. Recompute the behavior digest through `seshat skills register --dry-run`; apply the reviewed provenance update and rerun `skills review` and `verify`.
8. Rerun remediation review and require no remaining automatically remediable change.

Never change the actual business purpose merely to make wording uniform.

## Outside and bundled Skills

Do not edit outside behavior Authority in place. Return one or more safe routes: upgrade, upstream repair, project-owned public wrapper, explicit fork with a new ID and retained source/license evidence, disablement or removal.

Treat a Seshat bundled Skill installed in another project as outside. Route its defect to the Seshat Provider and reinstall or upgrade through `seshat init` after the Provider is fixed.

## Result contract

Report mode, ownership decision, before/after Agent-core alignment and digests, changed paths with reasons, gating, verification outcomes and remaining limitations. Always preserve:

```text
unaligned != remediation forbidden
unaligned = remediation input + formal enablement/readiness claims blocked
```
