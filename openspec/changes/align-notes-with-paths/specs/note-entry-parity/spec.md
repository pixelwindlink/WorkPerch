## ADDED Requirements

### Requirement: Notes expose the shared Tag Registry
The notes panel MUST provide a direct entry to the complete shared Tag Registry. Registry mutations MUST continue to use the existing Tag Actions, and the notes context MUST be able to filter the Registry to tags referenced by notes without creating a note-owned registry.

#### Scenario: Open Registry from notes
- **WHEN** the user activates the TAGS control in the notes panel
- **THEN** the shared TAG Registry dialog opens
- **AND** tags referenced by notes can be isolated through a Registry filter
- **AND** editing a tag continues to update the single shared Tag Item used by paths, notes, and projects

### Requirement: Notes provide recent and frequent entry shortcuts
The notes panel MUST render compact shortcuts for up to eight recently used notes ordered by `usage.lastUsedAt` and up to eight frequently used notes ordered by `usage.count` then recency. The shortcuts MUST use existing Engine-owned usage fields and MUST NOT introduce aggregate fields.

#### Scenario: Copying and revealing a recent note
- **WHEN** the user copies a note and its usage is recorded
- **THEN** the note can appear in the recent and frequent shortcuts according to its usage
- **AND** activating its shortcut clears conflicting note filters, scrolls to the note row, and highlights it

#### Scenario: No note usage exists
- **WHEN** no notes contain usage activity
- **THEN** the notes usage surface is hidden without occupying empty list space

### Requirement: Notes support shared-tag group filtering
The notes panel MUST allow filtering notes by one shared Tag Item ID in addition to text search. Clearing filters MUST reset both conditions, and saved note views MUST persist and restore the selected tag through the existing saved view `tagIds` field.

#### Scenario: Filter notes by tag
- **WHEN** the user selects a shared tag in the notes panel
- **THEN** only notes whose `tagIds` contain that Tag Item ID are rendered

#### Scenario: Restore a saved note view
- **WHEN** the user activates a saved view with `scope=notes` and a tag ID
- **THEN** the notes panel restores the query and selected tag filter
- **AND** renders matching notes from the current Engine snapshot
