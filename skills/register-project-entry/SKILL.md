---
name: register-project-entry
description: Compatibility entry for Perch project registration after the canonical Skill moved to .agents/skills. Use when an existing Agent, Prompt, or absolute path still opens skills/register-project-entry/SKILL.md.
---

# Register Perch project compatibility entry

This file is a compatibility adapter that preserves the old public path; it is not the workflow source.

1. Locate the nearest ancestor `engine.manifest.json` and require Engine ID `perch`.
2. Read `<perch-root>/.agents/skills/register-project-entry/SKILL.md` completely.
3. Follow only the canonical Skill for `perch.snapshot.get`, `perch.project.upsert`, revision conflict handling, state ownership and read-back verification.
4. Stop if the canonical file is missing or identity differs. Do not reconstruct or abbreviate the old behavior.
