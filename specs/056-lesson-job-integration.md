# 056 — Lesson job end-to-end handler

## Goal

Implement one bounded V1 slice: **lesson job end-to-end handler**.

## Depends on

- `010-generation-job-state-machine.md`
- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`
- `020-worker-polling.md`
- `022-worker-retries.md`
- `023-worker-concurrency.md`
- `048-curriculum-job-integration.md`
- `049-lesson-content-zod-schema.md`
- `050-lesson-source-retrieval.md`
- `051-lesson-generator.md`
- `053-image-asset-handling.md`
- `054-lesson-quality-checks.md`
- `055-lesson-regeneration.md`

## Requirements

- Implement lesson job: load skeleton/context → budget check → generate assets/content → QC/regenerate policy → persist content/status/schema/generation metadata.
- Write generated/reused assets and LLM call logs.
- After a lesson becomes `ready`, enqueue exactly one `question` job targeting that lesson's assessment using the DB idempotency constraint.
- A failed lesson never enqueues its question job; its assessment remains unavailable.
- Update job progress and course aggregate status.
- Keep lesson handler idempotent on retry.

## Acceptance criteria

- [ ] Independent lesson jobs can complete out of order.
- [ ] Ready content persists only after validation/QC.
- [ ] A ready lesson immediately has one queued/succeeded question job for its assessment without waiting for other lessons.
- [ ] Permanent failure affects only lesson/course gap state, not unrelated ready lessons.
- [ ] Retry does not duplicate ready content/assets/question jobs.

## Required tests

- Worker integration test with successful, regenerated, failed, and idempotently retried lesson fixtures.
- Milestone integration gate: lesson skeleton → ready lesson → one question job for its assessment.

## Out of scope

- Frontend renderer.
- Question generation implementation.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
