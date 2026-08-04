## ADDED Requirements

### Requirement: Throttled silent path refresh
After a successful snapshot load and whenever the page becomes visible again, the Web UI MAY invoke `dashboard.path.refresh-all` when the Engine is connected and the last successful silent refresh is older than ten minutes (UI-local preference). Manual refresh MUST still run immediately and bypass the silent throttle.

#### Scenario: Silent refresh after reconnect
- **WHEN** snapshot load succeeds and the silent throttle window has elapsed
- **THEN** the client requests `dashboard.path.refresh-all` with the current `expectedRevision`
- **AND** local path inspections are updated from the success payload

#### Scenario: Throttle suppresses repeat silent refresh
- **WHEN** a silent refresh completed less than ten minutes ago
- **THEN** a subsequent visibility event MUST NOT start another silent refresh

### Requirement: New-abnormal-only notification
Silent refresh MUST toast only when the set of abnormal path ids gains at least one new member compared to the set observed before that refresh. Manual refresh MAY continue to summarize totals.

#### Scenario: No toast when abnormalities unchanged
- **WHEN** silent refresh completes and the abnormal id set does not grow
- **THEN** the UI MUST NOT show a validity toast for that silent run
