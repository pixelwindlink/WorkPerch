## ADDED Requirements

### Requirement: Web UI loads through a modular composition entry
Dashboard Web UI MUST load through a single ES Module composition entry (`app.js`) that imports focused UI modules. The UI MUST NOT require a bundler or new production dependencies. Business state MUST continue to come only from Dashboard EngineMessage Actions; modules MUST NOT open a parallel writer or persist aggregate data in `localStorage`.

#### Scenario: Module entry is used by the HTML shell
- **WHEN** the Dashboard page is served
- **THEN** the document loads `app.js` as `type="module"`
- **AND** the composition entry imports UI modules from a dedicated `ui/` directory

#### Scenario: Static modules are available to Desktop and Server hosts
- **WHEN** Dashboard Server or Desktop Host serves the Web UI
- **THEN** the composition entry and its `ui/` modules are reachable as static resources
- **AND** the UI still talks to the Engine only through `POST /engine-message` (or the existing Desktop-local equivalent path)

### Requirement: UI module boundaries preserve current client responsibilities
Split modules MUST preserve the existing client-side responsibility split: theme, search, active tab, toasts, dialog drafts, header layout, and Desktop window preferences may remain client state; paths, notes, projects, tags, saved views, and inspections MUST be rendered from Engine snapshot data after successful connection.

#### Scenario: Disconnected UI stays read-only for business data
- **WHEN** the Engine connection is unavailable
- **THEN** the modular UI MUST keep business mutation controls disabled or ineffective
- **AND** MUST NOT fall back to writing aggregate data through `localStorage`

#### Scenario: Snapshot-driven lists still render after split
- **WHEN** a successful `dashboard.snapshot.get` response updates client state
- **THEN** path, project, and note views refresh from that snapshot
- **AND** shared tag chips continue to resolve through the Tag Registry ids carried by records

### Requirement: Critical dialog flows remain usable after modularization
Modal dialog flows that previously relied on logic inside the monolith MUST remain usable after the split, including TAG Registry delete confirmation that cannot depend on a native `confirm()` while a modal `<dialog>` remains open.

#### Scenario: Unused TAG can be deleted from the registry dialog
- **WHEN** the user deletes an unused TAG from TAG Registry
- **THEN** the UI presents a working confirmation path
- **AND** on confirm, the client sends `dashboard.tag.delete` with `expectedRevision`
- **AND** the registry list refreshes from the updated snapshot

#### Scenario: In-use TAG communicates why delete is blocked
- **WHEN** the user activates delete on a TAG that still has references
- **THEN** the UI MUST NOT send `dashboard.tag.delete`
- **AND** MUST present a clear in-UI explanation that the TAG is in use
