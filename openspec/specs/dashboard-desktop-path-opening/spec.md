# dashboard-desktop-path-opening Specification

## Purpose
TBD - created by archiving change enable-desktop-finder-path-opening. Update Purpose after archive.
## Requirements
### Requirement: Desktop path actions open Finder through a narrow host boundary
Dashboard Desktop SHALL expose one fixed preload capability for requesting that the current main window open an absolute local path in Finder, and SHALL NOT expose arbitrary IPC, file-system access, Electron shell access or command execution to the Renderer.

#### Scenario: User opens a registered directory
- **WHEN** the operator activates the open action for an existing absolute directory in Dashboard Desktop
- **THEN** Main Process SHALL open that directory in Finder and return a successful directory result

#### Scenario: User opens a registered file
- **WHEN** the operator activates the open action for an existing absolute file in Dashboard Desktop
- **THEN** Main Process SHALL open Finder at the parent directory with that file selected and SHALL NOT execute the file

### Requirement: Main Process validates every Finder path request
Dashboard Desktop SHALL accept Finder path requests only from the current Dashboard main window and only for bounded absolute paths without NUL characters that exist on the local file system.

#### Scenario: Renderer submits a relative path
- **WHEN** the fixed path channel receives a relative path
- **THEN** Main Process SHALL reject the request without invoking Finder or another application

#### Scenario: Recorded path no longer exists
- **WHEN** the fixed path channel receives an absolute path that cannot be stat'ed
- **THEN** Dashboard SHALL return a bounded understandable failure and SHALL NOT mutate Engine state

#### Scenario: Another WebContents invokes the channel
- **WHEN** an IPC sender is not the current Dashboard main window
- **THEN** Main Process SHALL reject the request before accessing the path

### Requirement: Path and project open controls use the Desktop capability
The file-path list and project entries without an HTTP(S) URL SHALL use the fixed Desktop Finder capability instead of attempting `file://` navigation.

#### Scenario: Path row open icon is clicked in Desktop
- **WHEN** the operator clicks the existing open icon for a file-path record
- **THEN** Dashboard SHALL invoke the Finder capability with that record's stored absolute path and display one success or failure feedback message

#### Scenario: Project path icon is clicked in Desktop
- **WHEN** a project has no Web URL and the operator clicks its directory action
- **THEN** Dashboard SHALL invoke the same Finder capability with the registered project path

### Requirement: Normal browsers degrade explicitly
When the fixed Desktop Finder bridge is unavailable, Dashboard Web UI SHALL keep business state readable and writable through EngineMessage but SHALL NOT pretend that the browser opened a local path.

#### Scenario: Browser user clicks a local path open action
- **WHEN** Dashboard runs in a normal browser without `openPathInFinder`
- **THEN** the UI SHALL explain that local Finder opening requires Dashboard Desktop and SHALL leave the page and Engine state unchanged
