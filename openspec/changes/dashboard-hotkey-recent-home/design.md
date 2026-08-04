## Context

Dashboard Desktop already owns a single BrowserWindow, Finder open IPC, always-on-top IPC, and usage metadata on paths/projects. The Web UI has a small usage chip strip and sticky search, but no OS-level summon path.

## Goals / Non-Goals

**Goals:**
- One global hotkey brings Dashboard forward and focuses a summon search overlay.
- Empty summon query shows recent paths and projects; typing filters registered entries only.
- Paths panel home rail becomes the obvious cold-start surface (more recent/frequent chips + recent projects).

**Non-Goals:**
- Spotlight/Raycast replacement, plugin system, or free-text disk search.
- New EngineMessage Actions or schema fields.
- Browser/Web-only hotkey registration.
- Changing Finder open security model.

## Decisions

1. **Hotkey default:** `Command+Shift+D` on macOS (`Control+Shift+D` elsewhere). Fixed in Main Process; not user-configurable in this change.
2. **Summon flow:** Main registers `globalShortcut` → show/restore/focus `mainWindow` → `webContents.send("dashboard:summon")` → renderer opens overlay and focuses its input.
3. **Preload surface:** `dashboardDesktop.onSummon(handler)` subscribes via allowlisted IPC; no general event bus.
4. **Palette actions:** Enter / click on a path opens Finder (existing bridge) and records usage; on a project reveals launcher tab (and opens Finder for project path when Desktop). Escape closes overlay.
5. **Home rail:** Raise path recent/frequent caps to 8; add up to 8 recent projects chips that switch to launcher and highlight. Rail stays above the full list; no list hiding toggle in this change.
6. **Unregister** shortcut on quit; fail soft if registration conflicts (stderr warning, app still runs).

## Risks / Trade-offs

- Hotkey collisions with other apps → fixed chord; document in UI hint.
- Focus races when window was on another Space → Electron show/focus best-effort.
- Summon overlay duplicates some search UX → acceptable for speed; sticky search remains.
