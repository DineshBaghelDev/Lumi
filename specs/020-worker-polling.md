# 020 — Worker polling and claim loop

## Goal

Implement one bounded V1 slice: **worker polling and claim loop**.

## Depends on

- `009-generation-jobs-schema.md`
- `010-generation-job-state-machine.md`
- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`

## Requirements

- Create worker process that polls `queued` jobs whose `available_at` is due.
- Claim jobs transactionally with `FOR UPDATE SKIP LOCKED` and transition through the canonical job-state service.
- Dispatch to typed handler registry for five job types.
- Before claiming/starting expensive work, respect course cancellation/budget state.
- Gracefully stop claiming on shutdown while allowing in-flight work to finish or terminate cooperatively according to cancellation policy.

## Acceptance criteria

- [ ] Two worker instances cannot claim the same job simultaneously.
- [ ] Claimed job records `locked_by`/`locked_at` and becomes `running`.
- [ ] Cancelled/budget-stopped course jobs are not newly executed.
- [ ] Unknown job type cannot execute silently.

## Required tests

- Worker integration test with concurrent claimers and cancelled-course fixture.

## Out of scope

- Heartbeat/retry/concurrency policy.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
