---
status: current
system: tasks
requirements:
  - REQ-TASKS-MIXED-REPOSITORIES-001
  - REQ-TASKS-MIXED-REPOSITORIES-002
  - REQ-TASKS-MIXED-REPOSITORIES-003
  - REQ-TASKS-MIXED-REPOSITORIES-004
  - REQ-TASKS-MIXED-REPOSITORIES-005
updated: 2026-09-14
---

# Mixed Repository Selection System Design

## Purpose and boundaries

One ordered task draft replaces the task-wide source switch. The backend
already resolves repository inputs individually. This design changes selection
and serialization while retaining server-owned identity and launch behavior.

The task system owns this vertical outcome. Provider connections remain owned
by integrations and plugins. Sets remain owned by workspaces.

## Requirement mapping

| Requirement | Design sections |
| --- | --- |
| REQ-TASKS-MIXED-REPOSITORIES-001 | Ordered draft, Submission, Defaults and compatibility |
| REQ-TASKS-MIXED-REPOSITORIES-002 | Provider eligibility, Picker, Failure and recovery |
| REQ-TASKS-MIXED-REPOSITORIES-003 | Consumers and sets, Mobile composition, Verification |
| REQ-TASKS-MIXED-REPOSITORIES-004 | Creation extension: draft and transport, persistence and first launch, shared UI |
| REQ-TASKS-MIXED-REPOSITORIES-005 | Creation extension: last-used state |

## Current implementation

- `task-create-dialog-repositories-state.ts` owns one ordered selection list and
  exposes local and remote projections only at compatibility boundaries.
- `buildRepositoriesPayload` maps the ordered union one row at a time. `RepoChipsRow`
  renders the shared picker without a task-wide source switch.
- `RemoteRepoProviderTabs` and the shared repository picker keep provider names
  visible above search. The tab strip scrolls horizontally when needed.
- `useRemoteRepositories` exposes a readiness catalog independent of list
  results. Built-in providers require enabled state and verified authentication;
  plugin providers use their configured, enabled, and tested callback result.
- `RepositoryProviderRegistration` in `apps/packages/plugin-sdk/src/index.ts`
  includes the optional readiness callback, and its lifecycle wrapper fences
  availability results by workspace and registration generation.
- `Service.resolveTaskRepositoryRows` in `internal/task/service/service_tasks.go`
  accepts mixed per-row locators. `repository_selection.go` preflights plugin
  inspection before writes. The completed repository-only change required no
  wire schema change; the folder creation extension below adds optional input.

## Ordered draft

Introduce `TaskRepositorySelection` as a discriminated union in the existing
task-create types module. Each row has a stable key and either a saved/local
selection or a remote selection. Reuse the current row field types within the
union. Preserve provider host, scope, immutable ID, URL, PR metadata, policy,
base branch, and checkout branch fields.

One draft reducer owns append, replace, remove, hydrate, and apply-set actions.
The picker does not add an empty row until the user commits a selection.
Picker cancellation is therefore a no-op. Row replacement resets only fields
derived from the replaced repository. Existing explicit sibling choices survive.

An explicit `touched` marker prevents default hydration from overwriting an
edited or intentionally empty draft. Stable keys are unique across all sources.
The reducer preserves insertion order, including local/remote/local sequences.

Do not infer local checkout availability from provider identity. Local contains
saved or discovered checkouts with an accessible local path. Remote-only saved
repositories are matched to their provider results or shown as saved results
inside the corresponding eligible provider tab. Sets can still restore them.

## Provider eligibility

Extend the existing `useRemoteRepositories` boundary with a normalized source
catalog, separate from repository-list results. Each entry carries provider ID,
label, icon, readiness state, and bounded failure reason. Readiness has loading,
ready, unavailable, and failed states. No second credentials store is introduced.

Built-in adapters combine the workspace enabled state with verified connection
state. Use `useIntegrationEnabledReader` and `INTEGRATION_ENABLED_KEYS`, or their
existing per-provider hooks. GitHub and GitLab require positive authentication,
not token presence. Azure requires its enabled state, `hasSecret`, and `lastOk`.
Use existing connection refresh events and the existing 90-second cadence.
Do not run repository listing for an ineligible provider.

Add an optional `getAvailability({ workspaceId, signal })` callback to
`RepositoryProviderRegistration`. It returns credential-free
`{ configured: boolean, enabled: boolean, tested: boolean }`.
All three values must be true. `tested` means the latest connection check for
the current configuration succeeded. It does not mean that a test once passed
for old credentials. A plugin reads its own connection state and enabled setting.
The host never assumes a `connection.get` action name or plugin configuration schema.

The registry lifecycle wrapper must fence and abort availability calls just as
it does listing and inspection. An unloaded or replaced registration cannot
restore old readiness. Refresh on picker opening, workspace change, availability
invalidation, registry change, and the shared cadence while the picker is open.
Each result is scoped to workspace and registration generation.

This callback is additive to the SDK, but absent readiness is unknown. Older
plugins remain registered for their existing consumers but have no tab in this
new picker until they adopt the callback. No list-success compatibility shortcut
is permitted because an empty cached response does not prove connection health.
Update the public SDK, host types, lifecycle tests, and `PLUGIN-API.md` together.
The fixture supplies deterministic availability. Production provider adoption
belongs in each provider's dedicated repository and is a release dependency.

Provider names come from the existing adapters and registry. Local is first.
Retain the current built-in ordering, then plugin registration ordering. Bitbucket
is a plugin label, not a new host provider branch. GitLab remains supported.

## Picker

Desktop uses the existing popover/list primitives. The fixed header contains
named tabs, then search. A single body scrolls results. The tab strip can scroll
horizontally without clipping labels or creating page overflow.

Search is source-scoped. Existing built-in search limits and plugin pagination
remain unchanged. Query changes cannot remove a healthy tab. Empty repositories,
no search matches, connection loading, and list failure have distinct states.
Late results cannot populate a different source or workspace.

Selecting a result adds or replaces one row and returns focus to its trigger.
Reopening remembers the last eligible tab in workspace-keyed browser memory.
This is ephemeral picker navigation, not durable task-create preference storage.
The fallback is always Local when memory names an unavailable provider.

Keep a visible `Paste repository URL` action in the picker footer. It enters a
URL input subview in the same surface, preserving existing inspect/Enter behavior.
This entry remains available with no provider tabs. Existing anonymous built-in
reads continue, while plugin inspection still requires the active owner.
Pasted URLs never manufacture authenticated browse eligibility.

## Submission

Refactor `buildRepositoriesPayload` into per-kind mapping over the ordered union.
Reuse current remote mapping, PR caches, fresh-branch behavior, and local
base-versus-checkout semantics. Do not concatenate two source lists at submit.
Apply existing validation and duplicate checks to the complete selection.

Map rows to the existing `CreateTaskParams.repositories` array and backend
`TaskRepositoryInput`. Backend preflight and resolver authority remain unchanged.
Add mixed-input tests at the service and HTTP/WS handler boundaries. Include a
local row, built-in remote row, and first-use plugin row with independent bases.
A plugin inspection failure must leave no task or repository writes, as required
by the existing plugin contract. Do not claim new transaction guarantees for
later failures outside that contract.

## Defaults and compatibility

Normalize existing `initialValues` and provider-created presets at the boundary.
Remove mode booleans from internal selection and rendering. Retain input adapters
where external or unrelated consumers still send legacy preset fields.
Never use those fields to discard rows after normalization.

Preserve backend-owned task-create preferences under ADR 0028. The initial
defaulting path runs only for an untouched draft. A deliberate final removal
must survive late repository discovery and user-settings responses.

Zero contents selects scratch. Folder rows coexist with repositories through the
creation extension below; the former exclusive optional-folder UI is retired.
Retain the existing Worktree-to-Local fallback when deriving an empty/folder-only
default, without silently changing an explicitly chosen executor.
With non-empty input, disable incompatible creation using the existing executor
capability guard and show its reason. Do not expand executor support.

## Consumers and sets

New Task and New Subtask share the union, reducer, picker, and serializer.
Keep inherited-source restrictions, provider presets, task retry input, branch
policies, and new-local-repository creation. Quick Chat remains separate.

Sets append missing registered members through the reducer. Matching uses saved
repository ID or an authoritative resolved identity, not display names. The first
existing matching row wins. Its source, position, and base remain unchanged.
Unresolved remote selections remain separate until existing server validation
can settle identity. Never equate repositories across provider hosts or scopes.

Set storage stays ID-based. Save-as-set includes eligible registered members,
retains first-row duplicate handling, and explains excluded paths or URLs.
There is no repository registration side effect merely from saving a draft set.
Sets remains available with empty or mixed task input and can populate it.

The repository-set specification now describes the unified draft: Sets remains
available in an editable task repository draft, including a mixed or empty
draft, and appends registered workspace members without changing existing rows.
Its storage exclusions remain: arbitrary remote URLs and local folders are not
saved as set members. Do not rewrite historical completed work-order results.

## Mobile composition

Use `useTouchDrawer` or `useResponsiveBreakpoint` and the interaction demonstrated by
`components/task/mobile/mobile-picker-sheet.tsx`. Extract a neutral shell if
needed rather than importing task-session business state into task creation.

The form shows stacked contents on phones and wrapping chips on desktop. Add uses
`+ Add Repository/Folder` when empty and `+ Add` otherwise. On phones it opens one
bottom drawer containing the three-choice menu; repository, folder, set, branch,
and URL views navigate within that drawer through Back. Desktop uses an anchored
menu replaced by the selected picker. Folder browsing reuses the existing host
filesystem service and native desktop folder dialog where available.

The header, tabs, and search remain fixed. One list owns vertical scrolling.
The footer clears the safe area. Height uses dynamic viewport units and must
remain usable with the software keyboard. Touch actions measure at least 44px.
Ordinary desktop controls remain 28px. All copy uses the five locale catalogs.

## Failure and recovery

Connection health controls browsing, never local checkout validity. Losing
remote credentials does not invalidate an independently selected local source.
Keep unavailable remote rows, their branches, and bounded recovery actions.
Recheck on retry. Do not silently change a remote row into a local checkout.
If the active provider disappears, show a source-unavailable notice and Local.

A list transport error retains a separately eligible tab and shows Retry.
A failed connection check removes the tab. An unknown initial check hides it.
Retained connection-dependent rows block submission until recovery or removal.
Anonymous URL rows use their existing anonymous access rules instead.

## Security and observability

No credentials enter rows, readiness values, analytics, or UI errors. Preserve
workspace authorization, manifest ownership, origin checks, and server inspection.
Existing bounded provider errors are sufficient. No new telemetry store or
background connection-testing service is required.

## Verification

The [plan](../../../plans/mixed-repository-selection/plan.md) maps every acceptance
criterion to targeted state, provider, transport, and Playwright evidence.
Phone checks cover the same mixed submission and failure recovery as desktop.
Rendered checks include keyboard focus, labeled tabs, overflow, and touch geometry.

## Related decisions and contracts

- [Task-create preference ownership](../../../decisions/0028-task-create-last-used-source-of-truth.md)
- [Plugin provider extensions](../../../decisions/2026-07-31-plugin-repository-provider-extensions.md)
- [Server-owned plugin resolution](../../../decisions/2026-08-26-server-owned-plugin-repository-task-resolution.md)
- [Repository sets](../../workspaces/system-design/repository-sets.md)
- [Requirements](../requirements/mixed-repository-selection.md)

## Creation extension: folders and unified contents

This section describes the implemented extension for requirements 004 and 005.
Tasks owns input, persistence, and restoration. Existing runtime
workspace-source materialization owns host
links and source boundaries. Workspaces still owns repository sets.

### Draft and transport

Use the implemented `TaskWorkspaceSelection` union, with the existing
`TaskRepositorySelection` compatibility alias: local/remote repository variants
plus `{kind: "folder", key, localPath, displayName?}`. Preserve row keys and
repository source metadata. Derived repository projections exclude folders;
Git queries, provider checks, and fresh-branch rules operate only on repositories.
Scratch is derived from an explicitly empty contents list, not from a second mode
boolean or the absence of repositories alone. Set expansion uses the same append
reducer and never serializes folder rows as repositories.

Add optional `workspace_sources` to HTTP and WS create input, with tagged
`repository` and `folder` entries compatible with `WorkspaceSourceInput` in
`service_workspace_sources.go`. Repository entries retain existing locator and
branch fields; folder entries carry host `local_path` and optional `display_name`.
Use presence-aware decoding: absent means legacy input, while `[]` means explicit
scratch and suppresses implicit parent repository inheritance in editable new
workspace mode. A locked reuse-parent mode must reject conflicting explicit input.
Reject requests combining the new field with legacy `repositories` or
`workspace_path`, rather than guessing which wins. Legacy callers keep their
current semantics, including omitted subtask inheritance and single-folder CWD.
Do not add a required field to unrelated MCP or provider-created callers.

Normalize both protocols before task preparation. New clients submit one ordered
array. Existing response `repositories` and `workspace_folders` retain their shapes;
merge their shared `position` values to recover source order. The first repository,
not the first folder, remains the primary repository for repository-only consumers.

### Persistence and first launch

Extend `preparedTask`, `prepareTaskForCreation`, and finalization in `service_tasks.go` to
prepare folder and repository sources before publishing `task.created` or starting
an agent. Reuse folder canonicalization and name validation from
`prepareFolderWorkspaceSource`; reuse server-owned repository inspection. Do not
implement creation as create-then-call `AttachWorkspaceSources`: that API requires
a repository-backed idle task and can expose partial startup.

`TaskWorkspaceFolder`, `WorkspaceSourceBatch`, and SQLite
`CreateWorkspaceSourceBatch` already provide durable folders and one position
sequence across repositories and folders. Reuse this storage rather than a second
folder table. Ensure the task and complete source batch cannot become launchable
until required writes finish. Extend the existing creation rollback path for batch
write failures; do not delete pre-existing repositories or user directories.
Validate all input first, retaining existing server inspection cleanup guarantees.
No schema migration was required because the existing source tables and shared
position sequence already cover creation-time folders and repositories.

Carry persisted folders into the existing `WorkspaceInfo.WorkspaceFolders` and
`workspace_sources_reconcile.go` flow on initial launch, restart, and retry. Audit
repository-count early returns in lifecycle `manager_launch.go` and
`manager_execution.go`: multiple folder-only sources need a managed root despite
having no primary repository. One folder alone retains direct host CWD semantics.
Mixed inputs use named sibling links under a Kandev-owned root; repository worktrees
retain existing preparation. Never place generated siblings inside user folders.
Files and agent context must expose all sources before the first turn. Task cleanup
removes owned links/root only, never the linked folders. Use existing ownership
markers and fail closed on conflicting entries.

Host folders remain Local/Worktree-only, consistent with attachment capability.
Keep repository-count constraints separate from total source count. Container and
remote execution cannot accept folders: show Local Folder disabled with a reason
in the creation menu and reject forged requests. A draft retains incompatible
rows when the executor changes. No host-to-remote copying or new Local multi-repo
capability is introduced.

### Last-used state

Extend backend `TaskCreateLastUsed` with a
`workspace_sources_by_workspace` map. Presence of a workspace entry, including an
empty array, is meaningful. Values are full replayable source descriptors and
branch/policy choices from successful normalized creation, not row keys, runtime
worktree paths, credentials, PR fetch caches, or transient errors. Preserve source
provenance so restored connection-dependent remote rows still use health gating.
Branch policy snapshots must remain compatible with the current preset adapter.

Update `buildTaskCreateLastUsedPatch` / `recordTaskCreateLastUsed`, the WS caller,
user model/DTO/store, boot/settings projection, and frontend settings types.
Retain ADR 0028 and [ADR 0041](../../../decisions/0041-backend-owned-portable-user-settings.md): the backend is the durable authority; targeted JSON
updates must preserve concurrent unrelated settings and other workspace entries.
Continue the existing workflow-by-workspace and agent/executor preference rules.
Save only after successful task creation and persist explicit empty snapshots.
Preference-write failure uses existing logging/recovery; it must not duplicate
an already-created task.

Hydration precedence: locked/inherited context or explicit preset, current user
edits, current-workspace snapshot, then legacy eligible defaults. Missing snapshot
and explicit empty snapshot must remain distinct through Go JSON, DTO, boot,
Zustand, and reducer layers. Untouched-only hydration rechecks at application
time; asynchronous results never repopulate a cleared draft. Revalidate restored
paths, repository identities, branches, and connections without erasing invalid
rows. Do not persist a UI fallback until a task actually succeeds.

### Shared UI and bottom helper

Replace exclusive folder controls and standalone Sets entry points in New Task
and editable New Subtask with one Add menu. Repository uses the existing readiness
picker. FolderPicker needs a reusable controlled browser body for same-sheet
navigation; retain native desktop selection and cancellation semantics. Repository
Set uses the existing set selector and registered-ID storage. Saving a set remains
available through its existing management affordance; folders remain excluded.

The existing executor explanation in `task-create-dialog-options.tsx` owns the
scratch sentence. Derive helper content from effective executor and complete
source composition. Empty means scratch, one folder means live folder CWD, mixed
contents means shared workspace root, and repository-only preserves existing hints.
Never render the scratch sentence or an empty repo placeholder in the top area.
All labels and errors use five locale catalogs. The combined ASCII previews and
mobile scroll/focus contract are in the new plan and its UI work orders.

### Verification and related implementation

Requirement 004 maps to creation persistence/runtime tests and desktop/phone Add
flows. Requirement 005 maps to preference CAS, transport, hydration, and reopen
flows. See the [workspace contents plan](../../../plans/workspace-contents-creation/plan.md).
The completed mixed-repository package retains its historical evidence; it does
not prove this extension. Reuse the [attachment design](attach-workspace-sources.md)
and [runtime source decision](../../../decisions/2026-07-22-runtime-mutable-task-workspace-sources.md).
