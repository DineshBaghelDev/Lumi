# 002 — Environment and config contract

## Goal

Implement one bounded V1 slice: **environment and config contract**.

## Depends on

- `001-monorepo-skeleton.md`

## Requirements

- Define `.env.example` with every currently known service/config key grouped by app/service.
- Implement `packages/config` Zod env parsers for API, worker, web-safe public env, and shared service URLs.
- Include configuration groups for:
  - InsForge/Auth/Storage/Realtime;
  - LiteLLM, SearXNG, Crawl4AI, TEI;
  - worker polling/heartbeat/stale-lock/concurrency;
  - course-generation budgets: max LLM calls/cost, research iterations, search queries, crawled sources/bytes, concepts, lessons, active generating courses per user, and course-creation rate limit;
  - research security: per-resource bytes, redirects, allowed outbound ports/MIME types, and other bounded crawl settings.
- Numeric/default guardrails must be centralized in validated config rather than hardcoded across handlers.
- Fail startup clearly on missing/invalid required config.
- Never expose server secrets through Next.js public variables.

## Acceptance criteria

- [ ] API and worker can load validated config independently.
- [ ] Invalid/missing required values produce actionable startup errors.
- [ ] Docker service env names match `.env.example`.
- [ ] Budget/security settings are available through typed config and have documented V1 defaults.

## Required tests

- Unit tests for valid/invalid env parsing, numeric bounds, and public-vs-server config separation.

## Out of scope

- No secret values committed.
- No deployment-provider-specific secret manager.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
