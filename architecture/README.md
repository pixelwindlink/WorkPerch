# Dashboard Engine Architecture

Architecture authority: `openspec/changes/define-generic-engine-runtime-architecture/design.md`.

```text
CLI / HTTP / Web UI / Electron Host
                ↓
EngineMessage Validator + Dispatcher
                ↓
Dashboard Application + Aggregate
        ↓                       ↓
Dashboard-private Ports        injected EngineClient Port
Repository / Inspector / Probe       ↓
        ↓                     project-launcher EngineMessage
Dashboard runtime_data          Project Launcher runtime_data
```

Dashboard owns paths, notes, project entries, shared tags, saved views, inspections and usage statistics. It does not own launched child processes or Launcher definitions. Project launch configuration and lifecycle are delegated through complete public EngineMessage requests to the independently registered `project-launcher` Engine.

Electron is the composition edge. It starts the two Engines with separate runtime roots, injects an allowlisted local EngineClient into Dashboard, and exposes no process capability to the Renderer. Standalone Dashboard without that injection keeps all catalog CRUD available and returns `DEPENDENCY_UNAVAILABLE` for launch Actions.
