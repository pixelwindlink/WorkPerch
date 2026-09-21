## MODIFIED Requirements

### Requirement: CLI accepts complete UTF-8 messages
CLI SHALL accept one complete EngineMessage from stdin and from `--message-file`, and server-client mode MAY be selected by `--server-url` or `PERCH_SERVER_URL`.

#### Scenario: Valid request is piped to stdin
- **WHEN** Standalone CLI owns an explicit `PERCH_RUNTIME_DIR`
- **THEN** stdout SHALL contain exactly one legal response and exit code SHALL be zero for success

### Requirement: HTTP exposes one business endpoint
Server SHALL host the existing static UI and accept complete messages only at `POST /engine-message`; it SHALL not introduce UI-private business APIs, and SHALL read `PERCH_SERVER_HOST` / `PERCH_SERVER_PORT` for loopback binding.

#### Scenario: Explicit port is occupied
- **WHEN** `PERCH_SERVER_PORT` is set and the requested port is already in use
- **THEN** the Server SHALL fail fast with a clear conflict message and SHALL not silently select another port

### Requirement: Canonical development server command is available
The Engine SHALL expose `npm run dev:server` invoking the root server entrypoint, default to a documented loopback port, automatically select a bounded next free port only when `PERCH_SERVER_PORT` is unset, and print the bound URL and primary human routes.

#### Scenario: Default port is occupied
- **WHEN** `PERCH_SERVER_PORT` is unset and the documented default port is unavailable
- **THEN** the Server SHALL bind a next available port within the bounded retry policy and print the selected URL
