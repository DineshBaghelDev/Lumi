# 010 — Generation job state machine and idempotency

## Goal

Implement one bounded V1 slice: **canonical generation-job lifecycle and database-backed idempotency invariants**.

## Depends on

- `009-generation-jobs-schema.md`

## Requirements

- Define the only valid V1 job statuses: `queued | running | succeeded | failed | cancelled`.
- Enforce lifecycle transitions through one shared service:
  - `queued → running` when claimed;
  - `running → succeeded` on completion;
  - `running → queued` on retryable failure when retries remain;
  - `running → failed` on permanent failure or retry exhaustion;
  - `queued | running → cancelled` when course generation is cancelled;
  - `failed → queued` only through explicit manual retry.
- Manual retry reuses the existing job row, clears transient error/lease fields, resets automatic attempt state, and records manual retry count in metadata.
- Add explicit nullable targets to `generation_jobs`: `lesson_id`, `project_id`, `assessment_id`.
- Enforce target/type consistency with DB checks.
- Add DB-backed uniqueness/idempotency invariants:
  - exactly one `research` job per course;
  - exactly one `curriculum` job per course;
  - exactly one `lesson` job per lesson;
  - exactly one `project` job per project;
  - exactly one `question` job per assessment.
- Job creation helpers must use conflict-safe insert semantics so concurrent/retried handlers cannot create duplicates.

## Acceptance criteria

- [ ] Invalid status transitions are rejected by the shared lifecycle service.
- [ ] Concurrent attempts to enqueue the same logical job result in one durable job row.
- [ ] Type/target mismatches are rejected at the database boundary.
- [ ] Retryable failure returns the same row to `queued` with a future `available_at`.
- [ ] Manual retry cannot create a duplicate logical job.

## Required tests

- Table-driven unit tests for every allowed and forbidden transition.
- DB integration tests for every partial unique constraint and target/type check.
- Concurrency test proving duplicate enqueue attempts collapse to one logical job.

## Out of scope

- Worker polling and heartbeat behavior.
- Course-level budget enforcement.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
