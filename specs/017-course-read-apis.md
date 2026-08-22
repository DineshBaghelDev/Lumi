# 017 — Course read APIs

## Goal

Implement one bounded V1 slice: **course read apis**.

## Depends on

- `007-core-course-schema.md`
- `008-learning-content-schema.md`
- `009-generation-jobs-schema.md`
- `013-fastify-foundation.md`
- `014-auth-middleware.md`
- `016-enrollment-creation-flow.md`

## Requirements

- Implement `GET /courses`, `GET /courses/:id?include=jobs`, `GET /courses/:id/curriculum`, `GET /courses/:id/lessons`, `GET /lessons/:id`.
- Enforce enrollment access.
- Return only fields/contracts required by planned frontend.
- `include=jobs` replaces a separate status endpoint.

## Acceptance criteria

- [ ] Owner can list/read course and partial generated state.
- [ ] Unauthorized users cannot read course/lesson details.
- [ ] Course detail can include current generation jobs without N+1 behavior.

## Required tests

- API integration tests for each route and authorization.

## Out of scope

- Mutation/progress routes.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
