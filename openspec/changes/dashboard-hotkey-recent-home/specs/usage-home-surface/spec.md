## ADDED Requirements

### Requirement: Expanded usage home capacity
The paths-panel usage home MUST allow up to eight recent paths and eight frequent paths (by existing usage fields) instead of five, and MUST remain hidden when both sections would be empty.

#### Scenario: Eight recent slots
- **WHEN** more than five paths have `usage.lastUsedAt`
- **THEN** the recent section may show up to eight of them ordered by recency
