## ADDED Requirements

### Requirement: Summon subscribe channel on Desktop bridge
Desktop preload MUST expose a narrow `onSummon` subscription that listens only to the Main-Process summon notification channel. It MUST NOT expose arbitrary IPC send/invoke beyond existing allowlisted Desktop operations.

#### Scenario: Renderer can subscribe to summon
- **WHEN** Dashboard Desktop preload loads
- **THEN** `window.dashboardDesktop.onSummon` is a function
- **AND** invoking it registers a callback for summon notifications from Main
