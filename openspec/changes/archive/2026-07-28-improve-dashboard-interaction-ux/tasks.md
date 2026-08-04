## 1. In-app confirm foundation

- [x] 1.1 Add confirm `<dialog>` markup and styles in `index.html` / `styles.css`
- [x] 1.2 Implement `ui/confirm.js` with `requestConfirm({ title, message, confirmLabel, cancelLabel, danger })`
- [x] 1.3 Replace business `confirm()` call sites across render/dialogs/backup modules

## 2. TAG Registry discovery

- [x] 2.1 Add all/unused/in-use filter controls to TAG Registry and wire local filter state
- [x] 2.2 Show per-tag reference summary (paths/notes/projects) and keep in-use delete blocked with clear feedback

## 3. Narrow viewport reachability

- [x] 3.1 Ensure ≤600px CSS keeps header tools reachable via wrap rather than `display:none`
- [x] 3.2 Verify active-tab search remains visible in compact sticky bars

## 4. Verification

- [x] 4.1 Update e2e/unit string contracts for confirm module, TAG filters, and no business `confirm(`
- [x] 4.2 Run `npm run check`, relevant tests, and `openspec validate --all --json`
- [x] 4.3 Smoke nested confirm from TAG Registry and import/legacy copy paths in code review checklist
