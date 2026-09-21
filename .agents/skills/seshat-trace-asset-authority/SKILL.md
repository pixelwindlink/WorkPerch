---
name: seshat-trace-asset-authority
description: Trace one existing or known project-relative path to its provisional asset type, governance level, path rule, Authority, consumers, lifecycle and project-map declaration without reading the asset content or recommending a new placement. Use when a human or Agent asks who owns a file, whether a path is governed, where its Authority route leads, or whether the current project map declares it.
---

# Trace Asset Authority

Trace current ownership and navigation facts only. Do not make a new placement decision.

## Execute

```bash
seshat trace --target /absolute/project --path project-governance/project-file-map.md --json
```

Return path existence, map declaration, provisional type, `2.1.2` reference, governance level, path rule and source, Authority, consumers, lifecycle and a safe next action.

## Responsibility boundary

- Do not read file content.
- Do not decide where a new asset should be created; use placement consultation.
- Do not audit the entire project or apply standardization.
- For out-of-scope paths, report only the boundary and owner route.
- For unclassified paths, return the unresolved classification and require responsibility evidence.

If the Seshat executable or result Schema is unavailable, stop instead of inferring ownership from basename alone.
