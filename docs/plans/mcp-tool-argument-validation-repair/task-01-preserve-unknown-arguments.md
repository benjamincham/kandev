---
id: "01-preserve-unknown-arguments"
title: "Preserve unknown arguments across validation failures"
status: done
wave: 1
depends_on: []
plan: "plan.md"
requirements:
  - REQ-INTEGRATIONS-MCP-TOOL-ARGUMENT-VALIDATION-001
acceptance_criteria:
  - AC-INTEGRATIONS-MCP-TOOL-ARGUMENT-VALIDATION-001.2
  - AC-INTEGRATIONS-MCP-TOOL-ARGUMENT-VALIDATION-001.3
system_design:
  - ../../specs/integrations/system-design/mcp-tool-argument-validation.md
---

# Task 01: Preserve unknown arguments across validation failures

## Summary

Make shared MCP validation diagnostics collect unknown properties from every
validation branch. Keep the reported paths, task-binding guidance, and value
redaction while preventing handler and backend dispatch for invalid calls.

## In scope

- Update `sanitizedToolArgumentError` and its unknown-property formatter.
- Add root and nested combined-failure regressions.
- Assert no backend dispatch and no submitted-value echo.

## Out of scope

- Schema definitions, MCP transport, task-change-request services, and UI.

## Acceptance

- A call with an unknown `task_id` and missing required fields reports both
  facts, includes the session-task binding rule, and does not dispatch.
- A nested unknown `task_id` remains associated with its `/patch` path when a
  sibling branch also fails validation.
- Diagnostics do not include the submitted task ID or other rejected values.

## Verification

```bash
(cd apps/backend && go test ./internal/mcp/server -count=1)
(cd apps/backend && go test ./internal/mcp/...)
node --test .github/scripts/pr-docs.test.cjs
python3 scripts/list-docs.py validate
python3 scripts/lint-spec-files.test.py
python3 scripts/lint-spec-files.py --all
git diff --check
```

## Files likely touched

- `apps/backend/internal/mcp/server/tool_argument_validation.go`
- `apps/backend/internal/mcp/server/session_bound_task_tools_test.go`
- `docs/specs/integrations/system-design/mcp-tool-argument-validation.md`
- `docs/plans/mcp-tool-argument-validation-repair/plan.md`
- `docs/plans/mcp-tool-argument-validation-repair/task-01-preserve-unknown-arguments.md`

## Dependencies

None. The existing MCP argument-validation requirement and ADR define the
boundary.

## Risks

- Do not use generic validator text or argument values in error responses.
- Do not close nested maps or change the backend task-binding check.

## Parallelism

`sequential`

## Inputs

- [MCP tool argument validation requirement](../../specs/integrations/requirements/mcp-tool-argument-validation.md)
- [MCP tool argument validation system design](../../specs/integrations/system-design/mcp-tool-argument-validation.md)
- [ADR-2026-08-01](../../decisions/2026-08-01-validate-mcp-tool-arguments.md)
- `sanitizedToolArgumentError`, `firstKeywordFailure`, and the session-bound
  tool tests.

## Results

Completed on 2026-09-16.

- The formatter now walks all validation causes and groups unknown properties
  by instance path with deterministic ordering.
- Root and nested `task_id` regressions pass with missing-field and branch
  failures, no backend dispatch, and no value echo.
- Focused MCP tests and the full internal MCP package suite pass.
