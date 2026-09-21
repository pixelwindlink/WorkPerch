---
name: seshat-review-contract-capability-closure
description: Review whether every stable Seshat Provider Contract has discoverable, executable, verifiable and deviation-remediation capabilities. This Skill is provider-self only; it does not review arbitrary external-project Contracts. Use when adding or changing a Seshat OpenSpec Contract or checking that a documented rule is not merely prose.
---

# Review Contract Capability Closure

Use the Seshat CLI as the executable Authority. A Contract is not operational merely because it appears in OpenSpec, `AGENTS.md`, README or a manifest.

## Execute

Run against the Seshat Provider. `--target` is retained only as a legacy invocation-context option; it is not the Contract review subject:

```bash
seshat contracts review --invocation-context /absolute/project --json
```

For compatibility, `seshat contracts review --target /absolute/project --json` is accepted and reported as `invocationContext`; target-project Contracts are not inspected. The JSON result reports `operatingScope=provider-self`, `providerRoot`, a `reviewSubject` of `seshat-provider`, and `targetContractsInspected=false`.

The result inventories every stable `openspec/specs/*/spec.md` Contract and reports four required routes:

- `discover`: where an Agent or program finds the Contract;
- `execute`: the command or Skill that performs its behavior;
- `verify`: the test or command that proves the behavior/result;
- `remediate`: the safe executor or reviewed OpenSpec Change route for deviations.

## Decision rules

- Treat `compliant` as closed only when all four routes and the Contract Authority resolve to live packaged capabilities.
- Treat `CONTRACT_CLOSURE_UNREGISTERED`, `CONTRACT_CLOSURE_DIMENSION_MISSING`, `CONTRACT_CLOSURE_ROUTE_MISSING` and `CONTRACT_CLOSURE_AUTHORITY_MISSING` as blocking evidence.
- Read-only audit, trace, compare and validation capabilities must route remediation to a separate executor or reviewed Change; they must not claim to repair themselves.
- Do not repair the registry manually from a report. Create or update an OpenSpec Change, implement the missing capability, then rerun closure review and `seshat verify`.

## Completion

Only after closure review is `compliant`, rerun:

```bash
seshat verify --target /absolute/project --json
```

Preserve the JSON result as evidence when required. The review is read-only and never modifies the target.
