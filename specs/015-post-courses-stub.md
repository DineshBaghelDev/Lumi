# 015 — POST /courses stub

## Goal

Implement one bounded V1 slice: **post /courses stub**.

## Depends on

- `007-core-course-schema.md`
- `009-generation-jobs-schema.md`
- `013-fastify-foundation.md`
- `014-auth-middleware.md`

## Requirements

- Implement `POST /courses` request/response schema for topic + goal/depth inputs required by V1.
- In one transaction create course in generating state and one queued research job.
- Return course and job identifiers/status without executing research synchronously.
- Make network retry behavior idempotent via an explicit request/idempotency strategy.

## Acceptance criteria

- [ ] Authenticated request creates exactly one course and one research job.
- [ ] Response is fast and does not depend on worker availability.
- [ ] Retry cannot accidentally create duplicate course/job when same idempotency key is reused.

## Required tests

- API integration test for creation transaction, rollback, and idempotency.

## Out of scope

- Enrollment creation is next spec.
- Research execution.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
