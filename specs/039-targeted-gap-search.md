# 039 — Targeted research gap loop

## Goal

Implement one bounded V1 slice: **targeted research gap loop**.

## Depends on

- `025-searxng-client.md`
- `026-crawl4ai-client.md`
- `030-search-query-generation.md`
- `031-source-filtering.md`
- `032-official-source-protection.md`
- `034-source-crawling.md`
- `035-source-chunking.md`
- `036-source-embeddings.md`
- `037-concept-source-mapping.md`
- `038-coverage-gap-detection.md`

## Requirements

- Generate targeted queries specifically from weak/unresolved coverage reasons.
- Run bounded additional search→filter→crawl→chunk→embed→map iterations.
- Stop on sufficient coverage, no meaningful new information, or configured iteration/source budget.
- Allow internally tagged model supplementation only when strong sources remain insufficient.

## Acceptance criteria

- [ ] Gap loop cannot run unbounded.
- [ ] New useful sources update source packs/coverage.
- [ ] Final required concepts end as covered, weakly_covered, or explicitly_unresolved with reasons.

## Required tests

- Pipeline test with forced missing concept followed by targeted fixture result; stop-condition tests.

## Out of scope

- Curriculum generation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
