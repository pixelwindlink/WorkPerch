## MODIFIED Requirements

### Requirement: Existing localStorage data is detected after Engine connection
Web UI SHALL inspect `local-dashboard.paths.v1` and `local-dashboard.notes.v1` only after a successful WorkPerch snapshot and SHALL continue treating `local-dashboard.theme.v1` as a browser preference; these historical keys SHALL remain byte-for-byte unchanged by the rename.

#### Scenario: Legacy paths and notes exist
- **WHEN** UI first connects to WorkPerch and no successful migration marker exists
- **THEN** UI SHALL display path/note counts and request explicit user confirmation before sending data

### Requirement: Legacy migration uses backup import
Confirmed localStorage migration SHALL construct a `perch-key-value-list` version 1 backup and invoke `perch.backup.import`, first as dryRun and then as an explicitly confirmed merge commit.

#### Scenario: Dry run rejects one legacy item
- **WHEN** WorkPerch reports invalid import
- **THEN** UI SHALL not issue the commit request and SHALL leave all localStorage data unchanged
