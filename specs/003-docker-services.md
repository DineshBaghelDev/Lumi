# 003 — Local Docker service stack

## Goal

Implement one bounded V1 slice: **local docker service stack**.

## Depends on

- `001-monorepo-skeleton.md`
- `002-env-config.md`

## Requirements

- Create Compose/config for SearXNG, Crawl4AI, LiteLLM, and TEI.
- Use environment variables defined by spec 002.
- Expose stable local ports/health checks.
- `services/*` contains configuration only; application source remains outside.

## Acceptance criteria

- [ ] `docker compose config` succeeds.
- [ ] All services reach healthy/running state with documented local endpoints.
- [ ] Stopping/restarting Compose does not require rebuilding application apps.

## Required tests

- Compose configuration validation.
- Manual/automated HTTP health smoke checks.

## Out of scope

- No InsForge/Postgres self-hosting.
- No web/API/worker containers for dev.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
