# 055 — Full lesson regeneration on QC failure

## Goal

Implement one bounded V1 slice: **full lesson regeneration on qc failure**.

## Depends on

- `051-lesson-generator.md`
- `054-lesson-quality-checks.md`

## Requirements

- If first generated lesson fails QC, regenerate the full lesson once using QC failure reasons as feedback.
- Run full validation/QC again.
- If second attempt fails, mark lesson generation permanently failed.
- Do not perform block-level surgery in V1.

## Acceptance criteria

- [ ] Exactly one regeneration maximum occurs for QC failure.
- [ ] Second failure produces permanent error compatible with job policy.
- [ ] Successful second generation fully replaces failed candidate.

## Required tests

- Unit/integration tests with deterministic mocked first-fail/second-pass and double-fail.

## Out of scope

- Manual editor/reviewer UI.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
