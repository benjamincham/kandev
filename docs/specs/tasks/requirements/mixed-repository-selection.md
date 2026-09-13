---
status: active
system: tasks
created: 2026-09-12
updated: 2026-09-13
owners:
  - kandev
---

# Mixed Repository Selection Requirements

## Overview

Users can attach local and remote repositories to one new task without changing
a task-wide source mode. Source tabs belong inside the repository selector.
Tasks owns this contract because the selected rows define task creation input.
Workspaces owns stored repositories and sets. Integrations and plugins own
connection health and provider identity.

## Terminology

- **Local:** An existing checkout accessible to the Kandev host, including a
  saved workspace checkout. This does not mean the phone or browser filesystem.
- **Remote:** A repository selected through a code-host provider or supported URL.
- **Eligible provider:** An available provider whose current workspace connection
  is configured, enabled, and successfully tested. Unknown health is not success.
- **Selected row:** One repository source with independent branch choices.

## Requirements

### REQ-TASKS-MIXED-REPOSITORIES-001: Mixed task input

**Intent:** Each repository can have its own source and branch choices.

#### Acceptance criteria

- **AC-TASKS-MIXED-REPOSITORIES-001.1:** New Task shall accept an ordered mixture
  of local checkouts, saved repositories, and supported remote repositories.
  Submission shall retain every selected row and its branch choices.
- **AC-TASKS-MIXED-REPOSITORIES-001.2:** Adding, removing, or replacing one row
  shall preserve other rows and their branches. Switching provider tabs shall
  not change any selected row.
- **AC-TASKS-MIXED-REPOSITORIES-001.3:** The form shall remove the task-wide
  Repo, Remote, and None switch. Each chip shall identify its source and expose
  repository selection, branch selection, and removal.
- **AC-TASKS-MIXED-REPOSITORIES-001.4:** Removing the final row shall select the
  no-repository state. Delayed defaults shall not repopulate that draft.
  Scratch tasks and optional local starting folders shall remain available.
- **AC-TASKS-MIXED-REPOSITORIES-001.5:** Existing branch policies, duplicate
  rules, executor limits, and server identity checks shall apply to mixed input.
  An unsupported combination shall show a reason without discarding input.
  Repository source selection shall not silently switch the executor.

### REQ-TASKS-MIXED-REPOSITORIES-002: Eligible source tabs

**Intent:** Users browse only sources that are ready for the current workspace.

#### Acceptance criteria

- **AC-TASKS-MIXED-REPOSITORIES-002.1:** Add repository shall show Local first,
  followed by named eligible provider tabs above search. GitHub, Bitbucket, and
  Azure are examples. Other configured repository providers shall use the same rule.
- **AC-TASKS-MIXED-REPOSITORIES-002.2:** Unconfigured, disabled, untested,
  failed, or unloaded remote providers shall have no browse tab. A configured
  token or installed plugin alone shall not prove eligibility.
- **AC-TASKS-MIXED-REPOSITORIES-002.3:** An eligible provider with no repositories
  or no matching results shall retain its tab and show an empty result state.
  Search results shall not determine connection health.
- **AC-TASKS-MIXED-REPOSITORIES-002.4:** Search shall filter the active source.
  Local results shall show paths. Remote results shall show owner or project.
  Provider and workspace changes shall reject stale results.
- **AC-TASKS-MIXED-REPOSITORIES-002.5:** Reopening the picker within the same
  workspace and browser session shall restore the last eligible tab.
  When that tab is unavailable, the picker shall select Local.
  This fallback shall not change task rows or saved task defaults.
- **AC-TASKS-MIXED-REPOSITORIES-002.6:** If a connection becomes ineligible,
  its browse tab shall disappear and affected remote rows shall remain visible.
  The form shall explain the connection problem and offer retry or settings.
  Submission shall remain blocked while those rows require unavailable access.
  A repository-list request failure alone shall show retry without changing
  a separately verified connection state.
- **AC-TASKS-MIXED-REPOSITORIES-002.7:** Supported URL and pull-request entry
  shall remain accessible without an authenticated browse tab. Anonymous reads
  shall retain their existing eligibility. URL inspection shall not enable a tab.

### REQ-TASKS-MIXED-REPOSITORIES-003: Consistent creation surfaces

**Intent:** Existing creation paths retain their capabilities with the shared selection model.

#### Acceptance criteria

- **AC-TASKS-MIXED-REPOSITORIES-003.1:** New Subtask shall support the same mixed
  selector when repository editing is allowed. Locked or inherited sources shall
  retain their current restrictions. Presets shall preserve source and branch identity.
- **AC-TASKS-MIXED-REPOSITORIES-003.2:** Applying a repository set shall append
  missing members to mixed input, in set order. Existing rows and branches shall
  remain unchanged. Saving a set shall retain the registered-repository limitation
  and explain excluded unregistered sources.
- **AC-TASKS-MIXED-REPOSITORIES-003.3:** Phone users shall manage repositories
  through a repository-count control and one bottom sheet. Source tabs and search
  shall appear inside that sheet. Add and branch navigation shall return to the
  selected list without stacking sheets.
- **AC-TASKS-MIXED-REPOSITORIES-003.4:** Desktop and phone controls shall support
  keyboard navigation, visible names, focus return, and localized copy.
  Phone action targets shall measure at least 44 CSS pixels. Only the provider
  strip can scroll horizontally. The page shall have no horizontal overflow.
- **AC-TASKS-MIXED-REPOSITORIES-003.5:** Connection, inspection, or task-create
  failure shall preserve the draft and show a bounded actionable error.
  Success shall persist the selected attachment order and per-row branches.

## Compatibility and exclusions

- Existing server authorization, provider inspection, and anonymous URL support
  remain authoritative. Browser eligibility is presentation state, not permission.
- Existing executor capability limits remain unchanged. This feature does not
  add multi-repository support to Local/Local PC or implement Remote Docker.
- Quick Chat, editing attachments on running tasks, new code-host integrations,
  and changing clone or worktree semantics are excluded.
- Repository sets continue to store workspace repository IDs and saved bases.
  Persisting arbitrary unregistered URLs in sets is excluded.
- No remote-to-local substitution occurs merely because clone origins match.
  Existing duplicate and server resolution rules still apply.

## Related contracts

- [Repository sets](../../workspaces/requirements/repository-sets.md)
- [Plugin repository task creation](../../plugins/requirements/repository-provider-task-creation.md)
- [Tasks without repositories](without-repositories.md)
- [System design](../system-design/mixed-repository-selection.md)
- [Implementation plan](../../../plans/mixed-repository-selection/plan.md)
