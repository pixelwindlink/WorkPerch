## ADDED Requirements

### Requirement: Narrow header overflow
At narrow viewport widths the header MUST keep primary controls (sort, saved view, theme, always-on-top when Desktop) visible, and MUST collapse lower-frequency actions (save view, delete view, legacy, export, import) into a single overflow control labeled for discovery.

#### Scenario: Overflow appears on narrow width
- **WHEN** the viewport width is at or below the narrow header breakpoint
- **THEN** the overflow control is visible
- **AND** the collapsed actions remain reachable from that control

#### Scenario: Wide layout keeps inline tools
- **WHEN** the viewport width is above the narrow header breakpoint
- **THEN** those actions remain inline without requiring the overflow control
