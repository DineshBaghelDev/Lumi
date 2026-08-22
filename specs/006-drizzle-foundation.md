# 006 — Drizzle and migrations foundation

## Goal

Implement one bounded V1 slice: **drizzle and migrations foundation**.

## Depends on

- `001-monorepo-skeleton.md`
- `002-env-config.md`
- `004-insforge-client.md`

## Requirements

- Create `packages/db` Drizzle config, connection factory, schema export structure, and migration commands.
- Enable pgvector extension migration capability.
- Keep DB schema ownership entirely inside `packages/db`.

## Acceptance criteria

- [ ] Migration generation and apply commands run against configured InsForge Postgres.
- [ ] A trivial test query succeeds through shared DB client.
- [ ] Other packages import DB types/client only from `packages/db` public exports.

## Required tests

- DB connectivity integration smoke test.

## Out of scope

- No full product schema yet.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
