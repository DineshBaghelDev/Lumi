# 041 — Research job end-to-end handler

## Goal

Implement one bounded V1 slice: **research job end-to-end handler**.

## Depends on

- `019-generation-budget-invariants.md`
- `020-worker-polling.md`
- `022-worker-retries.md`
- `024-litellm-client.md`
- `025-searxng-client.md`
- `026-crawl4ai-client.md`
- `027-tei-embedding-client.md`
- `028-expected-concept-map.md`
- `029-prerequisite-expansion.md`
- `030-search-query-generation.md`
- `031-source-filtering.md`
- `032-official-source-protection.md`
- `033-research-security-boundaries.md`
- `034-source-crawling.md`
- `035-source-chunking.md`
- `036-source-embeddings.md`
- `037-concept-source-mapping.md`
- `038-coverage-gap-detection.md`
- `039-targeted-gap-search.md`
- `040-research-assets.md`

## Requirements

- Implement single `research` job handler orchestrating all research stages internally.
- Write incremental job progress.
- Check course cancellation/budget before every search iteration, crawl batch, and LLM-heavy stage.
- Ensure every stage is retry/idempotency safe and respects research security boundaries.
- Coverage QC remains inside this job: expected-vs-observed comparison, gap searches, edge-case classification, final `covered | weakly_covered | explicitly_unresolved` states.
- On successful coverage completion persist outputs and enqueue exactly one curriculum job through conflict-safe job creation.
- On terminal failure/cancellation update job/course through centralized state services.

## Acceptance criteria

- [ ] One queued research job can produce expected concepts, sources, chunks, embeddings, mappings, assets, coverage states, and one curriculum job.
- [ ] Retry does not duplicate URLs/chunks/assets/jobs.
- [ ] Security-blocked sources cannot bypass the crawl/resource guard.
- [ ] Research stops when configured course limits or cancellation fire.
- [ ] No research sub-job type is introduced.

## Required tests

- Worker milestone integration gate using Redis-topic fixtures/mocks: `POST /courses → research job → persisted research outputs → curriculum job`.
- Forced retry/idempotency test.
- Budget-stop and malicious-source fixtures.

## Out of scope

- Curriculum implementation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
