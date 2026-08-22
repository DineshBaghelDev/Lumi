# 027 — TEI embedding client

## Goal

Implement one bounded V1 slice: **tei embedding client**.

## Depends on

- `002-env-config.md`
- `003-docker-services.md`
- `007-core-course-schema.md`

## Requirements

- Implement HTTP client for local TEI `/embed`.
- Target BAAI/bge-small-en-v1.5 and assert 384-dimensional vectors.
- Support batch embedding for chunks and single query embedding for chat/research relevance.
- Bound batch size and request timeouts.

## Acceptance criteria

- [ ] 384-dimension vectors are returned/validated.
- [ ] Dimension mismatch fails clearly.
- [ ] Batch and single embedding paths work.

## Required tests

- Unit tests with mocked vectors, mismatch, timeout.

## Out of scope

- Vector DB query helpers added where used.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
