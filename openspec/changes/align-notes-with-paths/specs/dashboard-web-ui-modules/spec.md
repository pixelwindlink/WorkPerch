## ADDED Requirements

### Requirement: Modular note surfaces reuse Engine-owned tags and usage
The modular Web UI MUST derive note tag filters, note Registry context, and note recent/frequent shortcuts from the same snapshot-owned `tags`, note `tagIds`, and note `usage` fields used by other Dashboard surfaces. UI modules MUST NOT persist a duplicate Tag Registry or note usage collection.

#### Scenario: Snapshot refresh updates note utility surfaces
- **WHEN** a successful snapshot or local Action patch updates tags or notes
- **THEN** the note tag selector, note Registry references, note usage shortcuts, and note list refresh from client state derived from that Engine response
- **AND** no aggregate business data is written to browser storage
