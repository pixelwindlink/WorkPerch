## 1. Scaffold and entry switch

- [x] 1.1 Create `ui/` directory and extract shared `state` / DOM helpers (`escapeHtml`, `icon`, element refs) without behavior changes
- [x] 1.2 Convert `index.html` script tag to `type="module"` loading `./app.js`, keeping boot order stable
- [x] 1.3 Reduce `app.js` to a composition entry that imports UI modules and runs the existing startup sequence

## 2. Extract feature modules

- [x] 2.1 Move EngineMessage client, connection banner, snapshot load/`afterWrite` into `ui/engine-client.js`
- [x] 2.2 Move path/project/note rendering and shared tag/sort helpers into dedicated render modules
- [x] 2.3 Move path/note/project/launch dialogs and TAG Registry (including delete confirmation outside open modal) into dialog modules
- [x] 2.4 Move drop-batch, backup/import/legacy, desktop theme/always-on-top/finder helpers, and header layout into dedicated modules
- [x] 2.5 Move `bindEvents` and top-level listeners into `ui/events.js`; ensure no `window.*` business API leakage

## 3. Tooling, tests, and docs

- [x] 3.1 Update `npm run check` to syntax-check `app.js` and all `ui/**/*.js`
- [x] 3.2 Update e2e/http-ui (and any monolith string assertions) for module entry + `ui/` layout while preserving connection/TAG dialog probes
- [x] 3.3 Document the UI module layout in `AGENT.md` and `README.md`
- [x] 3.4 Run `npm run check`, relevant tests, and `openspec validate --all --json`; Desktop pack smoke that UI modules load from asar

## 4. Verification checklist

- [x] 4.1 Verify disconnected UI stays read-only for business mutations
- [x] 4.2 Verify snapshot refresh updates all three lists and tag chips
- [x] 4.3 Verify unused TAG delete confirmation works from TAG Registry; in-use TAG explains block without calling delete
