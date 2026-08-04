## ADDED Requirements

### Requirement: Paths sticky bar disposition controls
The paths sticky toolbar MUST expose abnormal quick filter and batch-delete (when abnormal filter active) alongside existing search, tag filter, refresh-all, and TAG registry controls without breaking the single-row search + wrap filter layout on narrow widths.

#### Scenario: Abnormal controls remain reachable when narrow
- **WHEN** the paths panel is shown at a narrow width
- **THEN** abnormal filter and refresh-all controls remain usable
- **AND** search stays a single-line 34px control
