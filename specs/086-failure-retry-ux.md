# 086 — Failure, retry, and cancellation UX

## Goal

Implement one bounded V1 slice: **failure, retry, cancellation, and budget-stop UX**.

## Depends on

- `010-generation-job-state-machine.md`
- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`
- `022-worker-retries.md`
- `069-generation-progress-ui.md`
- `070-roadmap-ui.md`

## Requirements

- Implement `POST /generation-jobs/:id/retry` with authorization and canonical legal-state checks.
- Reuse/reschedule the existing failed logical job; never create a duplicate retry job.
- Render distinct fatal research/curriculum course failure vs retryable lesson/project/question failures.
- Render explicit user cancellation and budget exhaustion separately from technical failure.
- Show concise error/stop reason and recovery action without exposing raw secrets, hostile source bodies, signed URLs, or internal stack traces.
- Update UI through realtime/polling after retry/cancellation.

## Acceptance criteria

- [ ] Only failed retryable/allowed jobs can be manually retried.
- [ ] Retry reuses the logical job according to queue state machine/idempotency rules.
- [ ] Other ready course content remains navigable during item retry.
- [ ] Cancelled/budget-stopped courses preserve completed content and do not present the state as data loss.
- [ ] Security-rejected sources are surfaced only as safe research/gap information, not exploit payloads.

## Required tests

- API integration test and UI component/E2E retry/cancel/budget-state tests.

## Out of scope

- Automatic infinite retries.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
