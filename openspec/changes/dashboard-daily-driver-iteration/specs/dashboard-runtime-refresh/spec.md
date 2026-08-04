## ADDED Requirements

### Requirement: Bulk inspection patch after refresh-all
When `dashboard.path.refresh-all` succeeds, the Web UI MUST update `aggregateRevision` and patch each returned path inspection into local state without requiring a full snapshot reload, then re-render.

#### Scenario: Silent or manual refresh patches inspections
- **WHEN** refresh-all returns items with inspections
- **THEN** each matching local path entry receives the new inspection
- **AND** the UI re-renders path status badges from that local state
