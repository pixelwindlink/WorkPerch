## ADDED Requirements

### Requirement: All transports share one dispatcher and business core
CLI, HTTP, in-process Provider and Web UI SHALL use the same EngineMessage validator, Action validator, dispatcher, Application use cases and Domain rules without Transport-specific business branches.

#### Scenario: Equivalent snapshot request uses CLI and HTTP
- **WHEN** both transports target equivalent isolated state
- **THEN** their business payload and error code semantics SHALL be equivalent

### Requirement: CLI accepts complete UTF-8 messages
CLI SHALL accept one complete EngineMessage from stdin and from `--message-file`, and server-client mode MAY be selected by `--server-url` or `DASHBOARD_SERVER_URL`.

#### Scenario: Valid request is piped to stdin
- **WHEN** Standalone CLI owns an explicit runtime directory
- **THEN** stdout SHALL contain exactly one legal response and exit code SHALL be zero for success

### Requirement: CLI output and diagnostics are isolated
CLI stdout MUST contain exactly one EngineMessage response; diagnostics SHALL use stderr; protocol, Transport, business, state and internal errors SHALL exit nonzero.

#### Scenario: Unsupported Action is submitted
- **WHEN** dispatcher returns `UNSUPPORTED_ACTION`
- **THEN** CLI SHALL print only that response to stdout and exit nonzero

### Requirement: CLI ownership mode is explicit
CLI configured with a Server URL SHALL act only as HTTP client; without a Server URL it SHALL require explicit absolute `DASHBOARD_RUNTIME_DIR` and exclusive lock, and SHALL not silently fall back between modes.

#### Scenario: Configured Server is unavailable
- **WHEN** client-mode CLI cannot reach it
- **THEN** CLI SHALL return a protocol-shaped Transport error and SHALL NOT become a local writer

### Requirement: HTTP exposes one business endpoint
Server SHALL host the existing static UI and accept complete messages only at `POST /engine-message`; it SHALL not introduce UI-private business APIs.

#### Scenario: Business Action fails
- **WHEN** a legal request produces a domain error
- **THEN** HTTP SHALL return the full EngineMessage error and use HTTP status only for Transport semantics

### Requirement: HTTP input and static files are bounded
Server SHALL limit request bodies, handle invalid JSON, bind only configured loopback hosts, serve only approved static assets inside its static root and reject traversal.

#### Scenario: Request attempts encoded parent traversal
- **WHEN** static path resolution detects escape from the public root
- **THEN** Server SHALL return forbidden/not-found without reading the target file

### Requirement: Web UI is an EngineMessage client
Web UI SHALL use snapshot and write Actions for business state, SHALL keep only theme/search/tab/form state locally, and SHALL not read Engine state files or modify paths/notes/projects localStorage as current truth.

#### Scenario: Server cannot be reached
- **WHEN** UI initialization fails
- **THEN** UI SHALL show an explicit disconnected read-only state and SHALL NOT fall back to localStorage writes

### Requirement: Path groups are compact customizable visual tags
Web UI SHALL render path NAME, GROUP and NOTE in one compact identity area, SHALL make GROUP visually prominent, and SHALL allow selecting a bright preset or custom color that is persisted through `dashboard.path.upsert`.

#### Scenario: Existing path has no stored groupColor
- **WHEN** snapshot returns a path without groupColor
- **THEN** UI SHALL derive a stable bright presentation color from the group name without writing state implicitly

#### Scenario: User changes the group color
- **WHEN** the edit dialog saves a preset or custom color
- **THEN** UI SHALL include groupColor with expectedRevision and SHALL render the returned color after snapshot refresh

### Requirement: Web UI exposes one Group Registry editor
Web UI SHALL provide a Group Registry view that lists each shared Group Item once with its name, color and Path reference count, and SHALL route Group changes through Group Actions.

#### Scenario: User edits Engineering color from filtered paths
- **WHEN** the Group Registry updates the `工程` Group color
- **THEN** every path with that groupId SHALL display the same updated color regardless of the active filter

### Requirement: UI handles revision conflicts by reloading
Web UI SHALL include its latest aggregateRevision in writes and, on `DASHBOARD_REVISION_CONFLICT`, SHALL inform the user and fetch a new snapshot instead of silently merging.

#### Scenario: Another browser commits first
- **WHEN** current UI write receives a conflict
- **THEN** current UI SHALL refresh the snapshot and preserve the rejected user input for review where practical

### Requirement: Logs do not expose business payloads
Server and CLI diagnostics SHALL log only bounded operational metadata such as message ID, Action and status/error code, and MUST NOT log full note text, absolute path payloads, backup content or credentials.

#### Scenario: Import validation fails
- **WHEN** the failure is written to stderr or Server logs
- **THEN** diagnostic output SHALL omit the imported backup body

### Requirement: Electron Desktop Shell exposes a narrow local-path capability
Dashboard MAY provide an Electron Desktop Shell that loads the same Web UI and EngineMessage HTTP boundary, SHALL keep Node integration disabled and context isolation enabled, and SHALL expose only a preload capability that resolves the real path of a user-dropped File.

#### Scenario: User drops a Finder folder into Desktop Shell
- **WHEN** Electron can resolve the dropped File through its supported webUtils API
- **THEN** UI SHALL prefill both the folder name and absolute path in the existing Path editor, and final persistence SHALL still use `dashboard.path.upsert`

#### Scenario: Same UI runs in a normal browser
- **WHEN** no Desktop preload bridge or URI path is available
- **THEN** UI SHALL leave the absolute path empty, explain the browser limitation and SHALL NOT fabricate a local path

### Requirement: Desktop Shell preserves one Dashboard state owner
Desktop startup SHALL reuse a healthy Dashboard Server already listening at its configured loopback URL, SHALL create a Server only when none is available, and SHALL stop only the Server instance it owns.

#### Scenario: Dashboard Server already owns runtime state
- **WHEN** Desktop Shell starts while the configured Dashboard Server is healthy
- **THEN** Desktop SHALL connect to it without acquiring another state lock or starting another writer
