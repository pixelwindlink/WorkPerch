## Why

Daily use still requires manually finding and focusing the Dashboard window. Competitors like Raycast win on summon speed. Dashboard already tracks usage and has Finder/project actions, but lacks a system hotkey entry and still presents the full path list before recent entries on cold start.

## What Changes

- Add a Desktop-only global hotkey that shows/focuses the main window and opens an in-app summon palette.
- Summon palette searches paths and projects (recent-first when query empty) and supports open-in-Finder / reveal without new Engine Actions.
- Strengthen the paths-panel usage home into a primary recent/frequent rail (more slots; include recent projects).
- Extend Desktop preload with a narrow summon IPC subscribe channel only.
- **Non-goals:** no second window/Raycast clone, no arbitrary shell, no filesystem search, no browser hotkey (Desktop only), no aggregate schema changes.

## Capabilities

### New Capabilities

- `desktop-summon-palette`: global hotkey + quick search overlay for registered paths/projects
- `recent-entry-home`: cold-start recent/frequent rail as the primary paths-panel surface

### Modified Capabilities

- `dashboard-desktop-path-opening`: Desktop bridge gains a summon event channel while keeping Finder open constraints
- `usage-home-surface`: expand slot counts and include recent projects

## Impact

- Electron: `main.mjs` (`globalShortcut`), `preload.cjs`, desktop bridge ready-check
- UI: new `ui/summon.js`, `index.html` overlay, `styles.css`, `events.js`, `render-paths.js` home rail
- Tests: desktop unit + e2e markers; pack `/Applications/Dashboard.app`
- Docs: AGENT.md preload allowlist note for summon subscribe
