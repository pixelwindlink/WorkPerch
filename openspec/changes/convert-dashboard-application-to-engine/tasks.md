## 1. Contract and Project Foundation

- [x] 1.1 Update package scripts, ignore rules and runtime_data boundary for the Engine migration
- [x] 1.2 Create manifest 1.1 with Provider, Runtime planes, Transport and single-writer declarations
- [x] 1.3 Create the Dashboard Action Catalog and request/success Schema files for all standard and Dashboard Actions
- [x] 1.4 Add shared contract loading and JSON Schema 2020-12 subset validation that reads the canonical root envelope

## 2. Business Core and State Ownership

- [x] 2.1 Implement pure Dashboard domain entities, value normalization, aggregate invariants and domain errors
- [x] 2.2 Implement path, note and project upsert/delete plus revision conflict rules
- [x] 2.3 Implement legacy/Engine backup validation and merge/replace/dry-run domain behavior
- [x] 2.4 Define narrow Repository, Lock, Clock, ID, Seed and Endpoint Probe Ports
- [x] 2.5 Implement versioned JSON repository with atomic write, previous-revision backup and corrupt-state handling
- [x] 2.6 Implement exclusive state ownership lock with stale-owner handling
- [x] 2.7 Implement configured first-run project seed without user-specific source constants
- [x] 2.8 Implement restricted loopback endpoint probe with timeout and concurrency limits

## 3. Application, Dispatcher and Provider

- [x] 3.1 Implement transport-neutral Dashboard application use cases for snapshot and CRUD
- [x] 3.2 Implement project probe and backup export/import application use cases
- [x] 3.3 Implement envelope/action/success validation, Dispatcher routing and structured error mapping
- [x] 3.4 Implement Dashboard Engine lifecycle and Provider manifest/catalog/factory boundary
- [x] 3.5 Implement standalone and hosted Composition Roots with explicit runtime configuration

## 4. CLI and HTTP Adapters

- [x] 4.1 Implement CLI stdin and message-file Standalone Exclusive mode with stdout/stderr isolation
- [x] 4.2 Implement CLI Server Client mode without local writer fallback
- [x] 4.3 Replace the static Server with lifecycle-owned static Host plus POST /engine-message Adapter
- [x] 4.4 Enforce HTTP body, loopback binding, invalid JSON, logging redaction and static traversal protections

## 5. Web UI and Legacy Migration

- [x] 5.1 Convert the Web UI state source from localStorage/constants to dashboard.snapshot.get
- [x] 5.2 Route path and note writes through EngineMessage with expectedRevision and conflict refresh
- [x] 5.3 Add Engine-backed project CRUD and restricted probe while preserving command copy-only behavior
- [x] 5.4 Route backup export/import through Engine Actions with dry-run and explicit merge/replace
- [x] 5.5 Implement confirmed legacy localStorage migration, migration marker and manual cleanup
- [x] 5.6 Implement disconnected/direct-file read-only behavior without localStorage business fallback
- [x] 5.7 Preserve search, copy, pin, drag/drop and compact UI interactions after Engine migration

## 6. Verification and Admission

- [x] 6.1 Add unit tests for Domain CRUD, revision, backup behavior and probe policy
- [x] 6.2 Add contract tests for every Action Schema, v1.0 strictness, standard Actions and structured errors
- [x] 6.3 Add CLI tests for stdin, message file, exit codes, stdout/stderr and lock conflict
- [x] 6.4 Add persistence/integration tests for initialization, atomic commit, restart, corruption and single writer
- [x] 6.5 Add HTTP/CLI equivalence, HTTP security and Web UI E2E/migration tests
- [x] 6.6 Update README and AGENT with Engine responsibility, architecture, state modes, migration and operations
- [x] 6.7 Update the root dashboard registry record and only promote status using real conformance evidence
- [x] 6.8 Run Dashboard check/test suites, OpenSpec validation and required root static/black-box conformance commands
