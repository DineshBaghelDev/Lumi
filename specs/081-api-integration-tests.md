# 081 — API integration test suite

## Goal

Implement one bounded V1 slice: **API integration test suite**.

## Depends on

- `013-fastify-foundation.md`
- `014-auth-middleware.md`
- `015-post-courses-stub.md`
- `016-enrollment-creation-flow.md`
- `017-course-read-apis.md`
- `019-generation-budget-invariants.md`
- `072-assessment-ui.md`
- `074-progress-state.md`
- `075-notes-bookmarks.md`
- `077-rag-chat-api.md`
- `080-chat-citations.md`

## Requirements

- Create shared API test harness against isolated test database/auth fixtures.
- Cover auth, course creation/enrollment, reads, generation cancellation/budget/rate limits, retry endpoint, assessment serving/submission, progress, notes/bookmarks, chat/citations.
- Ensure tests assert transaction rollback, authorization boundaries, and idempotent mutation behavior.

## Acceptance criteria

- [ ] Critical API routes have deterministic integration coverage.
- [ ] Tests can run repeatedly without shared-state pollution.
- [ ] Failure output identifies route/invariant clearly.
- [ ] Unauthorized users cannot cancel/retry/read another user's course generation.

## Required tests

- This spec is itself the comprehensive API integration suite; include documented command. Earlier milestone integration gates remain required.

## Out of scope

- Playwright browser flow.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
