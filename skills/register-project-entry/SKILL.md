---
name: register-project-entry
description: Compatibility entry for Dashboard project registration after the canonical Skill moved to .agents/skills. Use when an existing Agent, Prompt, or absolute path still opens skills/register-project-entry/SKILL.md.
---

# Register Dashboard project compatibility entry

This file is a compatibility adapter that preserves the old public path; it is not the workflow source.

1. Locate the nearest ancestor `engine.manifest.json` and require Engine ID `dashboard`.
2. Read `<dashboard-root>/.agents/skills/register-project-entry/SKILL.md` completely.
3. Follow only the canonical Skill for `dashboard.snapshot.get`, `dashboard.project.upsert`, revision conflict handling, state ownership and read-back verification.
4. Stop if the canonical file is missing or identity differs. Do not reconstruct or abbreviate the old behavior.
