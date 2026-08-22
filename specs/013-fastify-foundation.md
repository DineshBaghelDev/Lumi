# 013 — Fastify API foundation

## Goal

Implement one bounded V1 slice: **fastify api foundation**.

## Depends on

- `001-monorepo-skeleton.md`
- `002-env-config.md`
- `004-insforge-client.md`
- `006-drizzle-foundation.md`

## Requirements

- Initialize Fastify server with Pino logging, health route, Zod-compatible validation approach, centralized error envelope, graceful shutdown.
- Wire `packages/config` and `packages/db`.
- Create route/plugin organization that later features can extend without app-to-app imports.

## Acceptance criteria

- [ ] API boots and `/health` returns success.
- [ ] Unhandled errors use consistent safe error responses and structured logs.
- [ ] Shutdown closes DB/server resources cleanly.

## Required tests

- API health integration test; error-envelope test.

## Out of scope

- Auth middleware.
- Product routes.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
