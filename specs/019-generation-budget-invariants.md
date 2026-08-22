# 019 — Course generation budgets and cancellation

## Goal

Implement one bounded V1 slice: **hard bounds that prevent runaway research/generation work and provide explicit cancellation**.

## Depends on

- `002-env-config.md`
- `007-core-course-schema.md`
- `009-generation-jobs-schema.md`
- `010-generation-job-state-machine.md`
- `012-llm-calls-tracking.md`
- `013-fastify-foundation.md`
- `014-auth-middleware.md`
- `015-post-courses-stub.md`
- `018-course-status-state-machine.md`

## Requirements

- Add a per-course generation-budget snapshot and atomic usage counters. A dedicated `course_generation_usage` row is preferred over repeatedly aggregating large logs during generation.
- Budget limits must be config-driven and snapshotted when a course is created so later env changes do not silently alter an in-flight course.
- V1 must support limits for at least:
  - total LLM calls;
  - estimated/recorded LLM cost;
  - research iterations;
  - search queries;
  - crawled sources;
  - total downloaded crawl bytes;
  - discovered concepts;
  - generated lessons.
- Add a configurable per-user limit for concurrently generating courses and course-creation rate limiting.
- Every expensive boundary (LLM call, search batch, crawl, gap iteration, lesson/project/question generation) checks the remaining course budget before starting.
- Budget counters are updated atomically so concurrent lesson jobs cannot lose usage updates.
- When a hard budget is exhausted:
  - stop scheduling new generation work;
  - mark remaining queued jobs `cancelled` with a budget-exhausted reason;
  - preserve already generated usable content;
  - record `budget_exhausted_at` and the violated invariant.
- Add `POST /courses/:id/cancel-generation`.
- Cancellation sets `cancel_requested_at`; queued jobs become `cancelled`; running jobs stop cooperatively at the next safe stage/call boundary.
- Extend course status with `cancelled`. Existing ready content remains readable after cancellation.
- Expose budget/usage summary through `GET /courses/:id?include=jobs` for generation UI/debugging.
- Default numeric limits live in validated environment config and `.env.example`; they are adjustable without code changes.

## Acceptance criteria

- [ ] A deliberately broad topic cannot exceed configured concept/lesson/research/crawl/LLM bounds.
- [ ] Concurrent workers update usage counters without lost updates.
- [ ] Budget exhaustion stops future work and records the exact invariant that fired.
- [ ] Manual cancellation stops queued work and running handlers terminate cooperatively.
- [ ] Completed lessons remain readable after cancellation/budget exhaustion.
- [ ] Course creation is rejected/throttled when configured per-user generation limits are exceeded.

## Required tests

- Unit tests for budget decisions and remaining-budget calculations.
- API integration tests for generation cancellation and creation rate/concurrency limits.
- Worker integration test proving budget exhaustion cancels remaining work without deleting completed content.
- Concurrent counter-update test.

## Out of scope

- Billing, subscriptions, payments, or user-facing credit systems.
- Exact pre-reservation of provider cost for in-flight calls; V1 may have bounded overshoot from already-started concurrent calls.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
