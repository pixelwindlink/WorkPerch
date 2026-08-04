## ADDED Requirements

### Requirement: Abnormal path quick filter
The paths sticky toolbar MUST provide a control that filters the list to entries whose inspection status is `missing`, `denied`, or `invalid`.

#### Scenario: Filter to abnormal paths
- **WHEN** the operator activates the abnormal quick filter
- **THEN** only path entries with abnormal inspection statuses are shown
- **AND** the visible count reflects that filtered set

### Requirement: Abnormal path disposition actions
For each abnormal path row, the UI MUST offer repair (existing), open-parent-in-Finder on Desktop when the absolute path has a parent directory, and delete. The UI MUST also offer a confirmed batch delete for currently visible abnormal paths using EngineMessage path delete Actions with current `expectedRevision`.

#### Scenario: Batch delete visible abnormal paths
- **WHEN** the operator confirms batch delete while the abnormal filter is active and at least one abnormal path is visible
- **THEN** the client deletes those entries through Dashboard path delete Actions
- **AND** a toast reports how many were removed
- **AND** on revision conflict the client reloads the snapshot and stops further deletes

#### Scenario: Open parent directory on Desktop
- **WHEN** the operator chooses open-parent for an abnormal path in Desktop
- **THEN** Main Process Finder open targets the parent directory of that absolute path (or reveals the file when the parent cannot be opened as a directory)
