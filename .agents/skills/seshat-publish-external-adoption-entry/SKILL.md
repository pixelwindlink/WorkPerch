---
name: seshat-publish-external-adoption-entry
description: Identify whether this project is a Provider that distributes capabilities — Skills, CLIs or SDKs — for other projects to install and use, and when it is, add a marker-bounded external adoption entry to the project README. Use when an Owner asks whether another project can adopt this one, what that project's responsibility Agent needs in order to install this project's capabilities, or why an adopter cannot discover them before installation. Do not publish, package, version or distribute the capabilities themselves, and do not copy a canonical Skill Contract into the README.
---

# Publish External Adoption Entry

Keep `README.md` as the project's first entry. When this project is a Provider, the README must also be the entry that lets another project's responsibility Agent adopt what this project distributes — before anything is installed.

## Decide whether this project is a Provider

Judge only from real evidence, never from intent, naming or aspiration:

- `.agents/skills/` entries that are offered to other projects
- `package.json` or a manifest that registers a command or package for external use
- `docs/` addressed to external users

If no evidence exists, stop. Do not write the section and do not invent an adoption path.

## Write the adoption entry

Add one marker-bounded README section that answers three questions for an adopting responsibility Agent:

1. What this project distributes to external projects — only what actually exists.
2. How another project installs it — concrete steps, never "depends". For a Skill distributed as files, name the source directory, the destination under the adopting project's `.agents/skills/`, and the copy step, then tell the adopting project to register it as `outside` with its source and behavior digest so later version changes surface as `SKILL_DIGEST_DRIFT`.
3. What rules the adopting Agent must follow afterwards.

## Boundaries

- The adopting Agent cannot read anything from this project before installing, so the README carries the whole handoff.
- Write only facts supported by this project's real files. Unknown classification, ownership or distribution scope goes to the Owner decision queue.
- Keep it navigational: route to the capability Authority instead of duplicating it.
- Do not publish, package, version or distribute the capabilities themselves.
- Do not copy a canonical `SKILL.md` Contract, OpenSpec requirement or CLI definition into the README.

Report whether the project is a Provider, the evidence used, the section written and every question left to the Owner.
