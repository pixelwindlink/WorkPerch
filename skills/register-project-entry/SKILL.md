---
name: register-project-entry
description: Register or update the current engineering project in Dashboard Engine's project launcher catalog through the official dashboard.snapshot.get and dashboard.project.upsert EngineMessage Actions. Use when an agent responsible for another project is asked to add, onboard, sync, or verify that project in Dashboard 项目入口, without editing Dashboard seed/source/state files or executing project commands.
---

# Register a Dashboard project entry

Register the project through Dashboard EngineMessage. Treat Dashboard aggregate state as the only authority after initialization.

## Resolve boundaries

1. Resolve `DASHBOARD_ROOT` as the directory two levels above this `SKILL.md`.
2. Read these contracts before writing:
   - `DASHBOARD_ROOT/engine.manifest.json`
   - `DASHBOARD_ROOT/contracts/actions/dashboard.snapshot.get.request-payload.schema.json`
   - `DASHBOARD_ROOT/contracts/actions/dashboard.snapshot.get.success-payload.schema.json`
   - `DASHBOARD_ROOT/contracts/actions/dashboard.project.upsert.request-payload.schema.json`
   - `DASHBOARD_ROOT/contracts/actions/dashboard.project.upsert.success-payload.schema.json`
3. Do not edit Dashboard `configured-project-seed.mjs`, `app.js`, `dashboard-state.json`, lock files, backups, registry records, or Action Schemas to add a project.
4. Do not execute the project's command. Store it only as inert text for display and copying.

## Collect project facts

Inspect the current project and derive:

- `id`: prefer a stable manifest/package/repository ID; otherwise use the directory basename converted to lowercase kebab-case. It must match `^[a-z0-9][a-z0-9-]{0,95}$`.
- `name`: human-readable project name.
- `type`: one of `engine`, `candidate`, `tool`, `application`, `workspace`, `archive`, `other`. Use `engine` only when project evidence really establishes an admitted Engine.
- `label`: short display label such as `Engine`, `Candidate`, `Tool`, or `Workspace`.
- `description`: concise purpose, at most 500 characters.
- `path`: canonical absolute project root. Never invent or retain a path from another checkout.
- `url`: real HTTP(S) launcher URL or `""`. Do not invent an endpoint.
- `port`: real launcher port or `0`.
- `command`: real developer startup command or `""`; keep it inert.
- `tags`: unique short strings, at most 30.
- `pinned`: default `false` unless explicitly requested.

Prefer facts from manifest, package metadata, README, actual entrypoints, and verified runtime configuration. Distinguish design claims from code and runtime evidence.

## Select the transport

Prefer Server Client mode:

1. Use `DASHBOARD_SERVER_URL` when configured.
2. Otherwise try Dashboard's declared default `http://127.0.0.1:4173` as a client URL.
3. If the Server is unavailable, stop and ask for either a working Server URL or the authoritative absolute `DASHBOARD_RUNTIME_DIR` with confirmation that no Server owns it.

Use Standalone Exclusive mode only with an explicitly supplied authoritative absolute runtime directory. Never silently fall back, invent a runtime directory, delete a lock, or write into Dashboard source.

## Read the current snapshot

Send a complete request through `DASHBOARD_ROOT/cli.mjs`:

```json
{
  "protocol": "generic-engines/engine-message",
  "version": "1.0",
  "kind": "request",
  "id": "register-project-snapshot-<unique>",
  "engine": "dashboard",
  "action": "dashboard.snapshot.get",
  "payload": {}
}
```

Preferred invocation:

```text
node <DASHBOARD_ROOT>/cli.mjs --server-url <DASHBOARD_SERVER_URL> --message-file <request.json>
```

Standalone invocation, only when explicitly authorized:

```text
DASHBOARD_RUNTIME_DIR=<absolute-runtime-dir> node <DASHBOARD_ROOT>/cli.mjs --message-file <request.json>
```

Parse stdout as exactly one EngineMessage. Treat nonzero exit or `status: "error"` as failure.

## Decide add versus update

Inspect `snapshot.payload.projects`:

1. Match the proposed stable `id` first.
2. Also compare normalized absolute project paths.
3. If the path already exists under another ID, reuse that existing ID and update the entry instead of creating a duplicate.
4. If the proposed ID belongs to a different project/path, stop and report the identity conflict.
5. Preserve the existing `pinned` value on update unless the user explicitly changes it.

Use `snapshot.payload.aggregateRevision` as `expectedRevision`.

## Upsert through EngineMessage

Send every required project field:

```json
{
  "protocol": "generic-engines/engine-message",
  "version": "1.0",
  "kind": "request",
  "id": "register-project-upsert-<unique>",
  "engine": "dashboard",
  "action": "dashboard.project.upsert",
  "payload": {
    "expectedRevision": 0,
    "item": {
      "id": "project-id",
      "name": "Project Name",
      "type": "tool",
      "label": "Tool",
      "description": "Short purpose",
      "path": "/absolute/project/path",
      "url": "",
      "port": 0,
      "command": "npm start",
      "tags": ["Node.js"],
      "pinned": false
    }
  }
}
```

Generate JSON with a structured serializer or editing tool. Do not interpolate untrusted project strings into executable shell syntax.

If the response is `DASHBOARD_REVISION_CONFLICT`, fetch a new snapshot, re-evaluate identity/path matches, and retry once with the new revision. Do not loop indefinitely or perform client-side silent merging.

If the response is `STATE_OWNERSHIP_CONFLICT`, do not remove the lock. Start/use the owning Dashboard Server or obtain explicit runtime-owner guidance.

## Verify the saved entry

1. Fetch a fresh `dashboard.snapshot.get`.
2. Verify the saved ID, absolute path, type, URL/port, command string, tags, and new aggregate revision.
3. If the entry has a loopback HTTP(S) endpoint, optionally call `dashboard.project.probe` with only the saved project ID. Treat the result as launcher liveness, not another Engine's `system.health`.
4. Do not probe remote hosts or temporary request-supplied URLs.

Report:

- whether the entry was added or updated;
- saved project ID and path;
- previous and committed aggregate revisions;
- transport used;
- optional probe result;
- any omitted or unverified metadata.

Do not claim success until the fresh snapshot contains the expected entry.
