---
name: seshat-remediate-project-readme
description: Review and incrementally remediate a Seshat-governed project's README consumer journey when users ask to inspect, improve, fix or complete Quick Start, AI/Agent next actions, terminal-versus-chat guidance, Agent-specific invocation, update, uninstall, brownfield, troubleshooting, limitation or Authority navigation. Use review intent without writing; use apply intent only for evidence-backed README additions while preserving project voice and business content. Queue unknown product positioning or ownership for the Owner. Do not replace path-only standardization, Skill conformance remediation or general documentation authoring.
---

# Remediate Project README

Keep `README.md` as the project's first entry. Improve consumer outcomes without turning the README into a second OpenSpec, Skill, CLI or Runtime Authority.

## Choose the mode

- Treat review, inspect, analyze and recommendation requests as read-only.
- Treat remediate, fix, complete, improve or apply requests as write authorization only when the absolute target is explicit.
- Keep ambiguous intent in review mode.

## Review

1. Read the project `README.md`, `AGENTS.md`, applicable OpenSpec Authority, CLI/catalog facts and Agent Registry entry.
2. Run `seshat readme review --target <absolute-project> [--agent <agent-id>] --json`.
3. Report missing consumer outcomes, current evidence, safe changes and Owner decisions. Do not enforce exact headings or invent product claims.

## Apply

1. Run `seshat readme remediate --target <absolute-project> --agent <agent-id> --dry-run --json`.
2. Confirm the plan changes only `README.md`, preserves existing business prose and derives commands/invocations from live CLI and Registry facts.
3. Apply with `--apply` only after the plan is reviewed.
4. Rerun `readme review`, `audit` and `verify`; a second remediation dry-run must contain no mechanical operation.
5. Put unresolved value proposition, target audience, ownership, deletion, license or public-exposure choices in the Owner queue.

## Boundaries

- Installation begins from a trusted CLI or Provider; an uninstalled Skill cannot discover or install itself.
- Static Registry, adapter and projection evidence do not prove runtime discovery or automatic triggering.
- `seshat-standardize-information-assets` owns deterministic path and navigation normalization, not README product semantics.
- `seshat-remediate-skill-conformance` owns Skill trigger and resource semantics, not README consumer prose.
- Preserve outside/bundled Authority, user content, source, Runtime, credentials and unknown directories.

Report mode, changed paths, before/after findings, remaining Owner decisions, evidence tier and the distinction between static, runtime and forward evidence.
