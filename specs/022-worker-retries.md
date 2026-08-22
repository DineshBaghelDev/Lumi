# 022 — Worker retry policy

## Goal

Implement one bounded V1 slice: **worker retry policy**.

## Depends on

- `010-generation-job-state-machine.md`
- `020-worker-polling.md`
- `021-worker-leases-heartbeats.md`

## Requirements

- Classify errors into retryable and permanent categories.
- Retry up to 3 automatic attempts using 5s, 15s, 45s backoff.
- Retryable failure with retries remaining transitions the same job `running → queued` and sets future `available_at`.
- Permanent errors or exhausted retries transition `running → failed` immediately.
- Persist attempts, sanitized error metadata, and release lease fields correctly.
- Explicit user retry of a terminal failed job uses the lifecycle behavior defined in `010-generation-job-state-machine.md`; it never inserts a duplicate logical job.

## Acceptance criteria

- [ ] Network/timeout/rate-limit/5xx errors follow backoff schedule.
- [ ] Auth/known permanent validation failure does not retry automatically.
- [ ] Terminal job releases lease and updates course aggregate state.
- [ ] Automatic retry reuses the same job row.

## Required tests

- Unit tests for classification/backoff; worker integration test for rescheduling and manual retry reuse.

## Out of scope

- Per-handler business error details beyond common categories.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
