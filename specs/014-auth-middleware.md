# 014 — API JWT authentication and authorization foundation

## Goal

Implement one bounded V1 slice: **api jwt authentication and authorization foundation**.

## Depends on

- `005-google-auth.md`
- `013-fastify-foundation.md`

## Requirements

- Implement Fastify auth plugin that validates InsForge-issued JWT on protected requests.
- Attach typed authenticated user identity to request context.
- Provide reusable course/enrollment authorization helper.
- Treat RLS as secondary safety net rather than primary enforcement.

## Acceptance criteria

- [ ] Missing/invalid JWT receives 401.
- [ ] Valid JWT produces typed user context.
- [ ] Course authorization helper denies non-enrolled/non-authorized users.

## Required tests

- API integration tests for missing, invalid, valid tokens and authorization helper.

## Out of scope

- Fine-grained sharing roles beyond enrollment fields.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
