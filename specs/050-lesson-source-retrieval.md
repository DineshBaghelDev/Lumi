# 050 — Lesson source-pack retrieval

## Goal

Implement one bounded V1 slice: **lesson source-pack retrieval**.

## Depends on

- `007-core-course-schema.md`
- `036-source-embeddings.md`
- `037-concept-source-mapping.md`
- `045-module-lesson-skeletons.md`

## Requirements

- Given lesson skeleton objectives/concepts/source-pack references, fetch the most relevant stored chunks/assets within the course.
- Use pgvector/metadata filters as needed without LLM reranking.
- Include required prerequisite context and coverage confidence.
- Bound context size deterministically.

## Acceptance criteria

- [ ] Retrieved context only references course-owned valid sources/chunks.
- [ ] High-authority concept source packs are represented.
- [ ] Context size stays within configured budget.

## Required tests

- Retrieval integration tests with seeded Redis chunks and cross-course isolation.

## Out of scope

- Lesson generation prompt.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
