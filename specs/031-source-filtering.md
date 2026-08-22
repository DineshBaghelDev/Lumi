# 031 — Cheap source filtering and initial ranking

## Goal

Implement one bounded V1 slice: **cheap source filtering and initial ranking**.

## Depends on

- `025-searxng-client.md`
- `027-tei-embedding-client.md`
- `030-search-query-generation.md`

## Requirements

- Normalize URLs and remove duplicates/mirrors/obvious low-value results.
- Compute deterministic metadata score using source type/domain signals, freshness where meaningful, and cheap relevance from title/snippet.
- Optionally use embeddings/BM25-style relevance without full-page LLM reads.
- Keep output reasons/scores inspectable.

## Acceptance criteria

- [ ] Duplicate URLs collapse deterministically.
- [ ] Known low-value/irrelevant results can be excluded without an LLM call.
- [ ] Protected-source candidates are handed to protection logic before cutoff.

## Required tests

- Ranking/filter unit tests with fixture result sets.

## Out of scope

- Official-source verification/protection is separate.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
