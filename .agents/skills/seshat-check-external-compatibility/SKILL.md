---
name: seshat-check-external-compatibility
description: Check whether an explicitly selected Seshat Provider can safely serve an external target by verifying target accessibility, strict Node compatibility, executable command discovery, the exact canonical Skill inventory and Provider-owned result Schemas without installing or auditing the target. Use before external adoption, package handoff, bootstrap or init dry-run, especially when `--provider-root` differs from the running checkout. Do not treat compatibility as target governance or automatic-trigger evidence.
---

# Check External Compatibility

Validate the Seshat provider surface before using any write-capable Skill.

## Execute

```bash
seshat compatibility check --target /absolute/project --provider-root /absolute/seshat --json
```

Return selected Provider identity/version, target accessibility, full Node-range decision, installed executable command discovery, exact required Skill inventory, selected-Provider Schema availability and a safe next action. Missing canonical Skills, invalid Skills/Schemas, malformed versions and a runtime below a minor/patch floor remain incompatible. Never substitute a Schema or package fact from the running checkout when another Provider root was selected.

## Responsibility boundary

- Do not install Skills or create governance paths.
- Do not audit target information assets or claim target compliance.
- Do not inspect source, Runtime or user data.
- Do not bypass a failed runtime, CLI or Schema check with manual copies.

A `compatible` result only proves that the selected Seshat Provider can expose the contracts needed to begin `bootstrap/init --dry-run`; it does not prove that the target is governance-ready, installed, runtime-discovered or automatically triggered.
