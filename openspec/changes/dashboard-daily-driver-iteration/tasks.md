## 1. Abnormal path disposition

- [x] 1.1 Add client `abnormal` pathStatus filter + sticky bar controls (异常 / 清理异常)
- [x] 1.2 Add open-parent Finder action and wire batch delete with confirm + revision loop
- [x] 1.3 Update path row actions for abnormal disposition and e2e markers

## 2. Silent path refresh

- [x] 2.1 Add UI-local throttle helpers and new-abnormal toast comparison
- [x] 2.2 Hook silent refresh after snapshot load and visibility/focus events
- [x] 2.3 Keep manual refresh immediate and summarizing

## 3. Narrow header overflow

- [x] 3.1 Restructure header markup for overflow menu
- [x] 3.2 CSS/JS show overflow below breakpoint; keep primary controls inline

## 4. Path ↔ Project convergence

- [x] 4.1 Add promote-path action opening prefilled project editor
- [x] 4.2 Show duplicate project hint + reveal on path rows
- [x] 4.3 Ensure project highlight/reveal helper exists

## 5. Usage home strip

- [x] 5.1 Render recent/frequent chips above path list from usage fields
- [x] 5.2 Click chip reveals path; hide empty sections

## 6. Verification and ship

- [x] 6.1 Update e2e/contract assertions for new UI markers
- [x] 6.2 Run `npm test` / check; pack and update `/Applications/Dashboard.app`
