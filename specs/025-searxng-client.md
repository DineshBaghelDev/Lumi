# 025 — SearXNG client

## Goal

Implement one bounded V1 slice: **searxng client**.

## Depends on

- `002-env-config.md`
- `003-docker-services.md`

## Requirements

- Implement worker-side HTTP client for SearXNG JSON search.
- Support query, categories where needed, result limit, timeout/cancellation.
- Normalize result title/url/snippet/source metadata.
- Provide explicit error mapping for retry policy.

## Acceptance criteria

- [ ] Client converts SearXNG responses into stable internal search result contract.
- [ ] Timeout/network failures are classified retryable.
- [ ] Malformed response is handled safely.

## Required tests

- Unit tests with representative mocked responses/errors.

## Out of scope

- Search query generation.
- Ranking.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
