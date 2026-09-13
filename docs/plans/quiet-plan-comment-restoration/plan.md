---
created: 2026-09-13
status: draft
requirements:
  - REQ-TASKS-PLAN-COMMENTS-004
system_design:
  - ../../specs/tasks/system-design/plan-comments.md
legacy_specs: []
---

# Implementation Plan: Quiet Plan Comment Restoration

## Overview

Keep routine plan-comment checks silent after refresh. Show restoration progress
only for actual legacy drafts. One sequential work order updates the hook and
shared notice, then proves desktop and phone behavior.

The task system owns this repair because it owns plan comments and their
migration. The existing requirement lacks a notice-visibility rule. Criteria
`AC-TASKS-PLAN-COMMENTS-004.5` through `.7` add that rule without changing comment
ownership, persistence, or delivery safety.

## Evidence and root cause

The supplied screenshot shows the restoration notice above the chat composer.
The source trace explains its recurrence:

- `session-slice.ts` initializes `commentsMigrationStatusByTaskId` empty.
- `usePlanCommentMigration` defaults a missing status to `idle` after refresh.
- `PlanCommentMigrationNotice` renders progress for `idle` as well as `running`.
- `migrateLegacyComments` enters `running` with a current plan even when its
  legacy scan is empty. It then awaits `refreshMigratedComments`.
- `retry` also enters `running` before it discovers any remaining legacy rows.

Smallest reproduction: open a task with a plan and no legacy browser comments,
then reload. Hold the comment-list response pending to observe the false notice.
This is a source-confirmed path, not a completed browser reproduction. A notice
that never clears needs separate runtime evidence and is outside this repair.

## Scope

### In scope

- Silent prerequisite checks and empty legacy scans.
- Actual migration progress, missing-plan recovery, and retryable errors.
- Shared Plan, structured-chat, and passthrough-chat notice behavior.
- Deferred-response unit tests and desktop/phone reload regressions.

### Out of scope

- Removing the migration mechanism or changing browser storage formats.
- Removing or deduplicating the existing authoritative snapshot request.
- Weakening Send/Run readiness checks or changing their existing feedback.
- New timeout policy, backend changes, telemetry, or a persistent completion flag.
- Composer layout, navigation, new copy, and unrelated comment types.

## Technical approach

Extend `PlanCommentMigrationStatus` with `checking` in
`apps/web/lib/state/slices/session/types.ts`. Use this state for the empty-scan
snapshot request and retry prerequisite load in `use-plan-comment-migration.ts`.
Reserve `running` for a scan with at least one matching legacy plan comment.
Treat `checking` and `running` alike in active-operation effect guards.

Keep current plan-identity guards and per-store run deduplication. Preserve the
snapshot fetch, selective acknowledgement, failed rows, and no-plan branches.
Only `complete` sets readiness and releases the existing Send/Run migration gate.

Hide `idle`, `checking`, and `complete` in `plan-comment-migration-notice.tsx`.
Keep the other states and localized strings. Its three existing consumers
inherit the correction without layout-specific state or markup changes.

The authoritative design is
[Migration notice states](../../specs/tasks/system-design/plan-comments.md#migration-notice-states).
No new ADR is needed: the existing
[task ownership decision](../../decisions/2026-09-02-task-owned-plan-comments.md)
and persistence boundaries remain intact.

## ASCII UI preview

### UI-01: Task composer after refresh

Entry: open or reload a task chat. This region is outside the transcript scroll
area. The same inline composition serves desktop and phone.

```text
Before: ordinary refresh, no legacy drafts
+------------------------------------------------+
| (spinner) Restoring saved plan comments...      |
+------------------------------------------------+
| Queue instructions to the agent...              |
+------------------------------------------------+

After: routine checks or completed migration
+------------------------------------------------+
| Queue instructions to the agent...              |
+------------------------------------------------+

After: actual legacy migration
+------------------------------------------------+
| (spinner) Restoring saved plan comments...      |
+------------------------------------------------+
| Queue instructions to the agent...              |
+------------------------------------------------+

Recovery states (existing translated copy)
+------------------------------------------------+
| Migration error                       [Retry]  |
+------------------------------------------------+
| Queue instructions to the agent...              |
+------------------------------------------------+

+------------------------------------------------+
| Saved comments need a current plan              |
+------------------------------------------------+
| Queue instructions to the agent...              |
+------------------------------------------------+
```

Structural requirements: silent states allocate no banner row or status region.
Actual work and recovery retain the inline row. The Plan surface applies the
same visibility rule above its content. Copy and spacing in this sketch are
illustrative. Existing localization supplies the exact labels.

Phone entry remains the task Chat or Plan navigation. The closest shipped
exemplar is the dedicated phone task layout and its existing inline migration
notice. Both viewports share the hook and notice component. Phone text wraps
within the current surface, and Retry retains its 44 px coarse-pointer target.
The repair adds no overlay, scroll owner, viewport sizing, or safe-area rule.

This preview maps to `AC-TASKS-PLAN-COMMENTS-004.5` through `.7` and both E2E
specifications listed below.

## Tests

All proposed test names belong to Task 01. Implementation uses TDD.

| Criteria | Test file and proposed evidence |
| --- | --- |
| `.5`, `.6` | `use-plan-comment-migration.test.tsx`: `checks an empty legacy scan without claiming restoration`; hold snapshot pending and assert `checking`, blocked delivery, then completion |
| `.5`, `.7` | Same hook file: `ignores non-plan and other-task records`; include mixed storage and a fresh store after prior migration |
| `.6` | Same hook file: `shows migration only after discovering legacy rows`; defer create and final list separately |
| `.6` | Same hook file: `retries silently until remaining legacy rows are known`; cover partial failure, empty retry, and prerequisite/list errors |
| `.6` | Same hook file: `deduplicates checking runs and ignores stale plan settlement`; use concurrent mounts/StrictMode and a plan identity change |
| `.5` through `.7` | New `plan-comment-migration-notice.test.tsx`: `renders nothing for idle checking and complete`; cover running status, failure alert and Retry, and missing-plan notice |
| `.1` through `.4`, `.6` | Existing persistence, Run, structured-chat, and passthrough tests retain lossless migration and delivery barriers; add `checking` cases to existing gate tests |

The first RED assertions are the idle notice component case and the deferred
empty-scan hook case. Current code shows a notice and reports `running`.

## E2E tests

Extend existing suites without replacing their delivery and migration scenarios:

- `apps/web/e2e/tests/session/task-plan-comments.spec.ts`, project `chromium`:
  `refreshes without false restoration progress`. Observe initial mount and
  reload with no legacy rows, including a backend-owned pending comment.
- `apps/web/e2e/tests/session/mobile-task-plan-comments.spec.ts`, project
  `mobile-chrome`: the same no-legacy reload result through the phone Chat and
  Plan navigation. Extend the existing migration scenario to prove that a later
  reload stays silent after acknowledged legacy rows disappear.

Both cover `.5` through `.7`. Keep their existing selected-session Send,
primary-session Run, storage preservation, and touch assertions.
Use causal WS waits for `task.plan.comments.list` and `.create`, armed before
navigation. A post-load absence assertion alone cannot catch the initial flash.
Install a page-start DOM observer to retain any restoration-row appearance
through readiness, or hold the relevant WS response with an existing test helper.
Do not intercept these WS actions as HTTP routes or use a fixed sleep.
Assert retained pending context and a successful user Send after readiness.
Unit/component tests own the deterministic pending-state RED evidence.

## Work orders

- [ ] [Task 01: Correct migration notice states](task-01-correct-migration-notice-states.md)

## Verification results

Implementation checks are pending. Exact commands are in Task 01.
Design-package checks passed on 2026-09-13:

- `python3 scripts/list-docs.py validate`: 266 decisions and 840 specifications.
- `python3 scripts/lint-spec-files.test.py`: 36 tests passed.
- `python3 scripts/lint-spec-files.py --all`: all specification files passed.
- `git diff --check`: passed.

Product tests and rendered desktop/phone checks have not run because this turn
creates the package only. Task 01 retains their pending verification status.

## Risks

- Hiding progress must not set the gate complete before the snapshot resolves.
- An active `checking` state needs every effect guard that protects `running`.
- A retry with no remaining rows can still fail its snapshot request.
- Mounted desktop and mobile trees can create duplicate notices or requests.
- Persistent completion flags can suppress drafts from another browser tab.

## Related packages and public docs

The completed [task-owned plan comments package](../task-owned-plan-comments/plan.md)
is historical evidence. Its Task 04 migration and Task 05 E2E work feed this
repair. Their old test counts do not certify these new acceptance criteria.
The superseded session-switch package retains its original scope.

Public docs review found no restoration-banner instructions or screenshots to
change. The existing task guide describes comment ownership and delivery, which
remain unchanged. This package changes implementation intent only.
