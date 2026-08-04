## 1. Local refresh foundation

- [x] 1.1 Extend `afterWrite` to accept `{ probe, result, patch }` with upsert/delete/inspection/snapshot modes and unknown-tag fallback
- [x] 1.2 Migrate pin/delete/tag/view/repair/inspect call sites to payload patches
- [x] 1.3 Keep editor saves that may create tags, batch upsert, and import/migration on snapshot refresh

## 2. Launcher dependency guidance

- [x] 2.1 Add shared recovery copy and projects-panel notice when `launcherAvailable === false`
- [x] 2.2 Update toast/error paths for `DEPENDENCY_UNAVAILABLE` to use the recovery copy

## 3. Verification

- [x] 3.1 Update e2e/string contracts for local refresh helpers and launcher guidance
- [x] 3.2 Run `npm run check`, `npm test`, and `openspec validate --all --json`
