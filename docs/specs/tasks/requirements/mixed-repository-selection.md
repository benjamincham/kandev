---
status: active
system: tasks
created: 2026-09-12
updated: 2026-09-14
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
- **Selected row:** One repository source with independent branch choices, or one host folder without Git controls.
- **Local folder:** An existing host directory used live, without cloning or Git management. It can coexist with repository rows.

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
  Scratch tasks remain available. Folder selection and the empty-state presentation
  follow REQ-TASKS-MIXED-REPOSITORIES-004.
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
  through the shared contents list and Add entry point described in
  REQ-TASKS-MIXED-REPOSITORIES-004. Source tabs, folder browsing, sets, and branch
  navigation shall use one bottom sheet with Back, without stacking sheets.
- **AC-TASKS-MIXED-REPOSITORIES-003.4:** Desktop and phone controls shall support
  keyboard navigation, visible names, focus return, and localized copy.
  Phone action targets shall measure at least 44 CSS pixels. Only the provider
  strip can scroll horizontally. The page shall have no horizontal overflow.
- **AC-TASKS-MIXED-REPOSITORIES-003.5:** Connection, inspection, or task-create
  failure shall preserve the draft and show a bounded actionable error.
  Success shall persist the selected attachment order and per-row branches.

### REQ-TASKS-MIXED-REPOSITORIES-004: Workspace contents and shared Add menu

**Intent:** Users assemble task workspaces from folders and repositories through one entry point.

#### Acceptance criteria

- **AC-TASKS-MIXED-REPOSITORIES-004.1:** New Task shall accept multiple host folders alongside local and remote repository rows. Adding or removing any item shall preserve the order and settings of other items. Folders shall expose their path and removal, without branch controls or implicit repository registration.
- **AC-TASKS-MIXED-REPOSITORIES-004.2:** With no selected contents, the button shall read `+ Add Repository/Folder`. With at least one selected item, it shall read `+ Add`. Both shall open the same menu, in this order: Repository, Local Folder, Repository Set. An empty placeholder shall not count as selected contents.
- **AC-TASKS-MIXED-REPOSITORIES-004.3:** Each menu choice shall open its corresponding picker. Repository shall retain the eligible source tabs and supported URL entry. Local Folder shall allow browsing or entering a host path and adding that folder without removing repositories. Repository Set shall append missing members without replacing folders or existing branch choices. Cancelling a picker shall leave contents unchanged.
- **AC-TASKS-MIXED-REPOSITORIES-004.4:** Removing all contents shall select an empty scratch workspace. The top area shall contain the longer Add button and no empty repository placeholder or scratch explanation. `An empty scratch workspace will be created.` shall appear only in the existing bottom executor helper-text position. The helper shall change with the effective contents and executor.
- **AC-TASKS-MIXED-REPOSITORIES-004.5:** Supported local execution shall expose every selected source at launch, before the first agent turn. A single folder-only task shall use that folder as its working directory; multiple folders or repository-plus-folder tasks shall expose named siblings under a task-owned root. Folder contents remain live, file-only sources and survive task cleanup. Folder-only tasks shall not show Git panels.
- **AC-TASKS-MIXED-REPOSITORIES-004.6:** Invalid or inaccessible folders, conflicting names, and unsupported executor combinations shall show an actionable reason and preserve the draft. The system shall not silently omit a source, copy folders to remote machines, change an explicitly selected executor, or create a partial source list after source-validation failure. Canonical duplicate folders shall not be added twice.
- **AC-TASKS-MIXED-REPOSITORIES-004.7:** Phone users shall see stacked selected contents and the same contextual Add label. Add shall open one bottom sheet; choosing Repository, Local Folder, or Repository Set shall replace its body and provide Back. Header/search and primary actions shall remain reachable while results scroll. The controls shall satisfy AC-TASKS-MIXED-REPOSITORIES-003.4.
- **AC-TASKS-MIXED-REPOSITORIES-004.8:** Editable New Subtask shall use the same contents controls. Explicitly clearing an editable selection shall create scratch input, while inherited or locked workspace modes shall keep their restrictions. Omitted legacy subtask input shall retain existing inheritance behavior.

### REQ-TASKS-MIXED-REPOSITORIES-005: Complete last-used restoration

**Intent:** The next task starts with the workspace contents and settings that the user last used successfully.

#### Acceptance criteria

- **AC-TASKS-MIXED-REPOSITORIES-005.1:** Opening a fresh New Task draft shall restore the last successfully used ordered folders and repositories, per-repository branch choices, and the existing workflow, agent, executor, and remembered task settings. Workspace contents shall be scoped to the current workspace and user. Prompt text and temporary picker navigation are not remembered task contents.
- **AC-TASKS-MIXED-REPOSITORIES-005.2:** A successfully created empty scratch task shall be remembered as an explicit empty selection. A user without saved contents may receive existing eligible defaults. These states shall remain distinguishable.
- **AC-TASKS-MIXED-REPOSITORIES-005.3:** Explicit presets, inherited restrictions, and edits to the current draft shall take precedence over asynchronous last-used loading. Removing the last item shall remain effective after late settings, repository, or branch responses. Cancelling or failing task creation shall not replace last-used contents.
- **AC-TASKS-MIXED-REPOSITORIES-005.4:** Saved contents shall be revalidated. Missing paths, deleted saved repositories, unavailable connections, and invalid saved branches shall remain identifiable with an error and recovery/removal action. They shall not silently become scratch input or another repository. Invalid workflow/agent/executor defaults shall follow their existing eligibility and recovery rules.
- **AC-TASKS-MIXED-REPOSITORIES-005.5:** Existing single-repository last-used settings shall remain readable when no newer contents snapshot exists. Concurrent unrelated settings writes shall not erase newer contents. A successful creation shall update the full contents snapshot, including automatic selections, and preserve settings outside its ownership.

## Compatibility and exclusions

- Existing server authorization, provider inspection, and anonymous URL support
  remain authoritative. Browser eligibility is presentation state, not permission.
- Existing repository-count limits remain. Local Folder is supported for Local
  and repository-backed Worktree execution, using host paths. Folder-only and
  empty defaults retain the existing Worktree-to-Local default fallback. Explicit
  incompatible executor choices require recovery. Remote/container folder transfer
  and implementation of Remote Docker are excluded.
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

## Implementation packages

- [Original repository selection](../../../plans/mixed-repository-selection/plan.md): completed predecessor.
- [Workspace contents creation](../../../plans/workspace-contents-creation/plan.md): implemented extension for requirements 004 and 005 and revised empty/mobile criteria.
