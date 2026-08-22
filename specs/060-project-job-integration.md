# 060 — Project job integration

## Goal

Implement one bounded V1 slice: **project job integration**.

## Depends on

- `018-course-status-state-machine.md`
- `020-worker-polling.md`
- `022-worker-retries.md`
- `048-curriculum-job-integration.md`
- `057-project-generation.md`
- `058-project-milestones.md`
- `059-project-hints-guidance.md`

## Requirements

- Implement project handler that loads project skeleton, generates storyline/milestones/hints, validates and persists them.
- Run project jobs independently from lesson order where mappings permit.
- Make retry idempotent and item failure nonfatal to the whole course.
- Record LLM call/generation metadata.

## Acceptance criteria

- [ ] Project skeleton becomes ready full project content.
- [ ] Failed project remains retryable while course lessons remain usable.
- [ ] Retry does not duplicate milestone rows/content.

## Required tests

- Worker integration test for successful/failed/retry project job.

## Out of scope

- Project UI.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
