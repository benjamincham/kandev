---
id: "01-correct-migration-notice-states"
title: "Correct migration notice states"
status: done
wave: 1
depends_on: []
plan: "plan.md"
requirements:
  - REQ-TASKS-PLAN-COMMENTS-004
acceptance_criteria:
  - AC-TASKS-PLAN-COMMENTS-004.1
  - AC-TASKS-PLAN-COMMENTS-004.2
  - AC-TASKS-PLAN-COMMENTS-004.3
  - AC-TASKS-PLAN-COMMENTS-004.4
  - AC-TASKS-PLAN-COMMENTS-004.5
  - AC-TASKS-PLAN-COMMENTS-004.6
  - AC-TASKS-PLAN-COMMENTS-004.7
system_design:
  - ../../specs/tasks/system-design/plan-comments.md
---

# Task 01: Correct migration notice states

## Summary

Separate routine checks from actual legacy migration in the existing status
model. Keep routine refresh silent across Plan and chat surfaces while retaining
lossless migration, readiness checks, and visible recovery.

## In scope

- Add `checking` to the status union, hook transitions, and active-run guards.
- Hide the shared notice for `idle`, `checking`, and `complete`.
- Add the hook/component regressions and desktop/phone scenarios in the plan.
- Cover retry, mixed storage, plan replacement, and duplicate mounts.
- Preserve structured Send, passthrough Send, and Run barriers for `checking`.

## Out of scope

Backend changes, storage changes, request optimization, new strings, navigation,
and timeout policy. No persistent migration-completed marker.

## Acceptance

- Both RED cases fail for the documented behavior before production changes.
  The empty scan stays blocked until its authoritative snapshot resolves.
- Actual legacy drafts retain progress, acknowledgement-only cleanup, missing-plan
  recovery, and retry after errors. Non-plan and foreign-task records stay intact.
- Desktop and phone refresh show no false restoration row through initial load.
  Existing pending context survives and can accompany a user Send after readiness.

## ASCII UI preview

### UI-01: Task composer after refresh

Entry and states match the [full preview](plan.md#ascii-ui-preview).
One inline composition serves desktop and phone, with the existing phone
navigation and 44 px coarse-pointer Retry target.

```text
Routine check / complete       Actual legacy migration
+--------------------------+   +--------------------------------------+
| Queue instructions...    |   | (spinner) Restoring saved comments... |
+--------------------------+   +--------------------------------------+
                               | Queue instructions...                |
                               +--------------------------------------+

Failure                        Missing current plan
+--------------------------+   +--------------------------------------+
| Migration error [Retry]  |   | Saved comments need a current plan   |
+--------------------------+   +--------------------------------------+
| Queue instructions...    |   | Queue instructions...                |
+--------------------------+   +--------------------------------------+
```

The silent states have no reserved row or live region. Other states retain the
existing translated labels and semantics. The Plan surface follows the same
rule above its content. Spacing and abbreviated copy are illustrative.
Maps to `AC-TASKS-PLAN-COMMENTS-004.5` through `.7`.

## TDD sequence

1. Add `renders nothing for idle checking and complete` to the new notice test.
   Run the idle case before changing production code to prove the false row.
2. Add `checks an empty legacy scan without claiming restoration` to the hook
   tests. Hold the snapshot promise pending and expect the silent checking state.
3. Add the minimal status transition and notice correction from the design.
4. Cover the plan's retry, mixed-storage, duplicate-mount, and stale-plan cases.
5. Extend existing gate tests with `checking` and retain all prior cases.
6. Add browser assertions that detect a transient notice during refresh.
   Keep the existing desktop/phone delivery scenarios.
7. Run the exact commands below and record their results here and in the plan.

## Verification

Run from the repository root. Install dependencies once in a fresh worktree:

```bash
(cd apps && pnpm install --frozen-lockfile)
```

The new notice test exists after the RED step. Run the complete block from the
repository root after implementation:

```bash
(cd apps/web && pnpm exec vitest run hooks/domains/comments/use-plan-comment-migration.test.tsx components/task/plan-comment-migration-notice.test.tsx lib/state/slices/comments/persistence.test.ts hooks/domains/comments/use-run-comment.test.ts components/task/chat/chat-input-area.test.ts components/task/chat/chat-input-area.test.tsx components/task/passthrough-chat-composer.test.ts)
(cd apps/web && pnpm run typecheck)
(cd apps/web && pnpm exec eslint lib/state/slices/session/types.ts hooks/domains/comments/use-plan-comment-migration.ts hooks/domains/comments/use-plan-comment-migration.test.tsx components/task/plan-comment-migration-notice.tsx components/task/plan-comment-migration-notice.test.tsx components/task/chat/chat-input-area.test.ts components/task/chat/chat-input-area.test.tsx components/task/passthrough-chat-composer.test.ts hooks/domains/comments/use-run-comment.test.ts e2e/helpers/plan-comment-migration.ts e2e/tests/session/task-plan-comments.spec.ts e2e/tests/session/mobile-task-plan-comments.spec.ts)
(cd apps/web && pnpm run i18n:ratchet)
(cd apps/web && pnpm e2e:run --project chromium tests/session/task-plan-comments.spec.ts)
(cd apps/web && pnpm e2e:run --project mobile-chrome tests/session/mobile-task-plan-comments.spec.ts)
python3 scripts/list-docs.py validate
python3 scripts/lint-spec-files.py --all
git diff --check
```

Managed E2E commands rebuild production assets. Run desktop and phone commands
sequentially. Record discovered tests and final results for both projects.
Compare the rendered states with UI-01 during these runs. No browser or product
test has run during package creation.

## Files likely touched

- `apps/web/lib/state/slices/session/types.ts`
- `apps/web/hooks/domains/comments/use-plan-comment-migration.ts`
- `apps/web/hooks/domains/comments/use-plan-comment-migration.test.tsx`
- `apps/web/components/task/plan-comment-migration-notice.tsx`
- `apps/web/components/task/plan-comment-migration-notice.test.tsx` (new)
- `apps/web/components/task/chat/chat-input-area.test.ts`
- `apps/web/components/task/chat/chat-input-area.test.tsx`
- `apps/web/components/task/passthrough-chat-composer.test.ts`
- `apps/web/hooks/domains/comments/use-run-comment.test.ts`
- `apps/web/e2e/tests/session/task-plan-comments.spec.ts`
- `apps/web/e2e/tests/session/mobile-task-plan-comments.spec.ts`
- This work order and `plan.md` for delivery results.

Production callers stay unchanged unless type integration requires a mechanical
adjustment. Any additional changed test file needs its own exact command here.

## Dependencies

None. The existing task-owned comment implementation supplies all runtime paths.

## Risks

A missed `checking` guard can restart work or accept stale settlement. A hidden
notice must not bypass readiness. An absence assertion after load can miss a
flash. Use deferred hook tests and observation across browser startup.

## Parallelism

`sequential`

## Inputs

- [Requirements](../../specs/tasks/requirements/plan-comments.md#req-tasks-plan-comments-004-lossless-legacy-draft-migration).
- [Design](../../specs/tasks/system-design/plan-comments.md#migration-notice-states).
- [Plan test matrix](plan.md#tests) and [E2E matrix](plan.md#e2e-tests).
- Existing hook tests, comment persistence tests, and both session E2E files.
- Read `apps/web/AGENTS.md`, `/tdd`, `/e2e`, and `/mobile-parity` before implementation.

## Results

Implementation completed on 2026-09-13.

The TDD RED run failed in the two intended places: the notice rendered for the
idle state, and an empty legacy scan reported `running`. After the production
change, the focused migration and notice tests passed. The hook now reports
`checking` while the authoritative empty scan is pending, keeps Send and Run
blocked until completion, and reserves the visible progress row for actual
legacy records. Plan replacement, duplicate mounts, retry prerequisites, mixed
storage, failed rows, and missing-plan recovery remain covered.

Verification results:

- `pnpm install --frozen-lockfile`: dependencies already up to date.
- The exact Vitest block above: 7 files and 84 tests passed.
- `pnpm run typecheck`: passed.
- The targeted ESLint command above: passed with zero warnings.
- `pnpm run i18n:ratchet`: 0 added and 3 modified files clean; 644 guard entries intact.
- Desktop managed E2E: 2 tests passed, including the refresh silence regression and the existing Send/Run flow.
- Mobile managed E2E: 2 tests passed, including Chat and Plan refresh silence and the existing migration flow.
- `python3 scripts/list-docs.py validate`: 266 decisions and 840 specifications validated.
- `python3 scripts/lint-spec-files.py --all`: all specification files passed.
- Prettier check and `git diff --check`: passed.
