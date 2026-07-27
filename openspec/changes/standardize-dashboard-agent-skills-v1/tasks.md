> Generic Engines architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md` at the workspace root. These tasks do not modify Dashboard business behavior.

## 1. Canonical Skills

- [x] 1.1 Initialize canonical `register-project-entry` and `operate-dashboard` with skill-creator
- [x] 1.2 Move the full project-registration workflow to the canonical Skill and replace fixed-depth root resolution
- [x] 1.3 Replace the legacy Skill with a tested canonical delegation adapter
- [x] 1.4 Implement the Dashboard operations Skill and operations reference

## 2. Behavioral References

- [x] 2.1 Update Dashboard AGENT and README with canonical Skills and compatibility rules
- [x] 2.2 Update the standalone registration Prompt to canonical path while documenting legacy compatibility
- [x] 2.3 Extend contract tests for canonical behavior, legacy delegation, operations commands and manifest identity discovery

## 3. Verification

- [x] 3.1 Validate both canonical Skills and the legacy adapter with skill-creator
- [x] 3.2 Run Dashboard check, tests and OpenSpec validation

> Verification note: canonical/legacy Skill tests passed 4/4, `npm run check` passed, local OpenSpec passed 3/3 and root black-box conformance passed 3/3. The full project suite still has three pre-existing dirty-worktree business failures outside this Change (`Action` count and `groupColor` expectations); no business file was changed to hide them.
- [x] 3.3 Sync the Dashboard delta spec without archiving the Change
