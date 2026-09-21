# Assurance Contract

## Outcome routes

Use the machine result's explicit route names:

- `fixedAutomatically`: deterministic in-scope governance write.
- `fixedByAgentRemediation`: semantic Skill work routed to the remediation Skill.
- `ownerDecisionRequired`: authority, intent, ownership, deletion, downgrade or exposure choice.
- `outsideRouteRequired`: outside/bundled Skill upgrade, upstream repair, wrapper, fork, disablement or removal.
- `unsupportedEnvironment`: a required evaluator or forward harness is unavailable.
- `blocked`: unsafe precondition, conflict or invalid contract prevents the operation.
- `verified`: second pass proves no deterministic operations remain.
- `unverifiedClaims`: static evidence exists but forward/runtime/source evidence does not.

## Journal

`project-governance/assurance/journal.json` is evidence, not behavior Authority. It records the run ID, input digest, operation IDs, completed checkpoints, changed paths and forward-only recovery command. Resume only when the input digest and path preconditions still match. A stale plan blocks; it is rebuilt from current files.

`project-governance/assurance/owner-decisions.json` is a deduplicated queue. It must contain the evidence and safe choices, not an inferred answer. Resolve the smallest queue entry and rerun assurance.

## Claim separation

Static Codex compatibility proves only that the Skill has a canonical entry, valid frontmatter/description, boundaries and resource routing. Forward evaluation proves actual selection by the current Agent environment. Governance readiness proves Seshat-managed assets converge. None of these prove business behavior, Runtime health, deployment or source correctness.
