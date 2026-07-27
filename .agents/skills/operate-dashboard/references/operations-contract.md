# Dashboard operations contract

Generic Engines architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md` at the workspace root.

## Identity and boundaries

- Engine ID: `dashboard` from `engine.manifest.json`.
- Default loopback Server: `http://127.0.0.1:4173`.
- Message endpoint: `POST /engine-message`.
- State mode: single writer.
- Runtime variable: `DASHBOARD_RUNTIME_DIR`.
- Canonical Skills: `.agents/skills/operate-dashboard/` and `.agents/skills/register-project-entry/`.
- Legacy registration adapter: `skills/register-project-entry/`.

## Commands

```bash
npm run check
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e
npm test
openspec validate --all --json
DASHBOARD_RUNTIME_DIR=<absolute-runtime> npm start
node cli.mjs --server-url http://127.0.0.1:4173 --message-file <request.json>
```

From the Generic Engines root:

```bash
node conformance/runner.mjs --engine dashboard --json
```

## State ownership

- Server is the normal writer.
- Server Client CLI never opens local state.
- Standalone CLI must use an explicit isolated absolute runtime and acquire its lock.
- A lock conflict is evidence; do not remove the lock or silently fall back.

Dashboard has no guaranteed canonical file log sink. Use stderr, structured EngineMessage errors and root conformance output unless a separately declared Logger integration exists.

## Common failures

- `STATE_OWNERSHIP_CONFLICT`: use the owner Server or another isolated runtime.
- `DASHBOARD_REVISION_CONFLICT`: re-read snapshot and retry deliberately.
- `DASHBOARD_STATE_CORRUPT`: preserve state and backups; do not overwrite with defaults.
- Server unavailable: report Transport failure; do not create a second writer against the same state.
