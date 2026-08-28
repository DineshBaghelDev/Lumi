# T02 — Recalculate course status after terminal jobs

## Problem
The worker settles individual jobs without calling `deriveCourseStatus`, leaving courses stuck in `generating`.

## Scope
Write only `apps/worker/src/worker.ts`, `packages/db/src/courses.ts`, and focused tests in those packages. Do not change API routes.

## Acceptance
- Every terminal success, retry exhaustion/permanent failure, cancellation, and relevant no-more-work path recalculates the course.
- Successful partial courses become `ready_with_gaps`; fully complete courses become ready; active work remains generating.
- Existing idempotency and failure semantics remain intact.
- Add a regression test reproducing a course with no active jobs and mixed terminal results.
