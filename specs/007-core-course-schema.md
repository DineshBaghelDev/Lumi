# 007 — Core course and concept schema

## Goal

Implement one bounded V1 slice: **core course and concept schema**.

## Depends on

- `006-drizzle-foundation.md`

## Requirements

- Add `users`, `courses`, `enrollments`, `concepts`, `course_concepts`, `concept_dependencies`, `sources`, `source_chunks`, `concept_sources`, and `assets`.
- Include course status/generation metadata fields and enrollment ownership/access fields; ownership is represented by enrollment role rather than a redundant `courses.owner_id`.
- Use canonical `concepts` plus `course_concepts` for course-specific importance/depth/coverage/source-pack metadata.
- Use typed concept dependency relationship values.
- Add normalized source URL uniqueness scoped to `(course_id, normalized_url)` for retry dedupe.
- Define source research metadata and vector(384) fields plus embedding model/version.

## Acceptance criteria

- [ ] Migration applies cleanly.
- [ ] Relationships and key constraints match `docs/DATA-MODEL.md`.
- [ ] HNSW cosine index exists on source chunk embeddings.
- [ ] Source URL dedupe can be enforced/queryable per intended scope.

## Required tests

- DB constraint/insertion integration tests for ownership, dependency uniqueness, source dedupe, vector column.

## Out of scope

- Curriculum/lesson/question/progress/job/chat tables.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
