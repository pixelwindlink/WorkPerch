## ADDED Requirements

### Requirement: Usage home strip on paths panel
The paths panel MUST show a compact home strip listing up to five recently used paths (by `usage.lastUsedAt`) and up to five frequently used paths (by `usage.count`, then recency). Activating a chip MUST reveal that path in the list. The strip MUST use existing Engine-owned usage fields only and MUST NOT introduce new aggregate schema fields.

#### Scenario: Recent chip reveals path
- **WHEN** at least one path has `usage.lastUsedAt`
- **THEN** the recent section lists that path among its chips
- **AND** activating the chip scrolls to and highlights the corresponding path row

#### Scenario: Empty usage hides sections
- **WHEN** no paths have usage data
- **THEN** the home strip hides empty recent/frequent sections without occupying large empty space
