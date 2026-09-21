---
name: seshat-review-information-changes
description: Review the current Git change set of an explicit project by changed path only, classifying mandatory governance, advisory machine assets, out-of-scope files and unclassified information risks without reading changed file contents or modifying the worktree. Use before commit, handoff or review when deciding which governance Authorities and Skills must inspect a change set.
---

# Review Information Changes

Review changed paths, not implementation correctness.

## Execute

```bash
seshat review changes --target /absolute/project --base HEAD --json
```

The target must be a readable Git worktree. The result includes each changed path's Git status, candidate asset type and reference, governance level, path rule source, Authority, consumers, lifecycle, review risk and safe next action.

## Responsibility boundary

- Do not read changed file contents.
- Do not evaluate source, tests or business implementation; mark them outside Seshat review.
- Do not replace a full project audit; this Skill only scopes the current change set.
- Do not apply fixes, stage files, commit or choose an Authority winner.
- Block the governance review when an information-shaped changed path is unclassified.

Route mandatory paths to their governance Authority, advisory assets to their program-consumer owner, and out-of-scope paths to the normal code or Runtime review process.
