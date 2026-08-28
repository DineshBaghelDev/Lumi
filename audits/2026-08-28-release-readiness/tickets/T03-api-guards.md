# T03 — Enforce API limits and repair stateful API mutations

## Problem
Configured quotas are dead; chat accepts foreign thread IDs; newly created thread IDs are not reliably reusable; citation hydration is inconsistent; assessment submission can duplicate paid grading.

## Scope
Write only `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `apps/api/src/milestone7.test.ts`, and `apps/api/src/rag.test.ts`.

## Acceptance
- Existing configured active-course, creation-rate, LLM-call, cost/token, and grading controls are enforced at the API boundary using existing DB/config patterns; failures are safe and explicit.
- Supplied chat thread IDs must belong to the requesting user/course; new thread IDs are returned and usable on the next message.
- Citation requests satisfy the schema and return a stable client-consumable shape.
- Assessment submission has an idempotency mechanism that prevents duplicate attempts/paid grading on retries.
- Add focused regression tests and run API tests/typecheck.
