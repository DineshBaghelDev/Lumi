# 082 — Worker pipeline and job orchestration tests

## Goal

Implement one bounded V1 slice: **worker pipeline and job orchestration regression suite**.

## Depends on

- `020-worker-polling.md`
- `021-worker-leases-heartbeats.md`
- `022-worker-retries.md`
- `023-worker-concurrency.md`
- `041-research-job-integration.md`
- `048-curriculum-job-integration.md`
- `056-lesson-job-integration.md`
- `060-project-job-integration.md`
- `066-question-job-integration.md`

## Requirements

- Create worker test harness with mocked external services and isolated DB/Storage fixtures.
- Exercise `research → curriculum → lesson + project`, with each ready lesson independently enqueuing/populating its assessment question job.
- Assert project jobs populate full milestone content fields.
- Assert retries/leases/idempotency/course state behavior and curriculum fatal failure.
- Assert job uniqueness constraints under duplicate/concurrent enqueue attempts.
- Assert generation budget exhaustion/cancellation stops remaining work while preserving completed content.
- Assert research security fixtures cannot reach crawl/storage through blocked URLs/redirects/resources.

## Acceptance criteria

- [ ] End-to-end worker fixture produces expected entity graph.
- [ ] Lesson 1 assessment can be populated while a later lesson job remains active.
- [ ] Retry does not duplicate jobs/content.
- [ ] Project milestones contain storyline/scenario/hints/outcomes rather than skeleton only.
- [ ] Budget/cancellation and security boundaries hold in orchestration tests.

## Required tests

- This spec defines the comprehensive worker pipeline regression suite/fixtures; earlier milestone gates remain mandatory and should already cover smaller chains.

## Out of scope

- Live external-service quality tests.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
