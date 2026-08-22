# 004 — InsForge client integration

## Goal

Implement one bounded V1 slice: **insforge client integration**.

## Depends on

- `001-monorepo-skeleton.md`
- `002-env-config.md`

## Requirements

- Create server-safe InsForge client/config integration for API/worker and browser-safe client only where needed.
- Document usage boundaries for database, storage, realtime, and auth.
- Centralize client creation; avoid ad-hoc initialization across features.

## Acceptance criteria

- [ ] API can perform a harmless authenticated/configured connectivity check.
- [ ] Web can initialize Realtime/Auth client without server secrets.
- [ ] Worker can access required server-side InsForge services.

## Required tests

- Client construction/config unit test or smoke test.

## Out of scope

- No product tables.
- No Google login UI yet.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
