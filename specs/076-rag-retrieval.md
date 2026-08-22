# 076 — Course-scoped RAG retrieval

## Goal

Implement one bounded V1 slice: **course-scoped rag retrieval**.

## Depends on

- `027-tei-embedding-client.md`
- `036-source-embeddings.md`
- `050-lesson-source-retrieval.md`

## Requirements

- Embed chat query with TEI.
- Perform pgvector top-k retrieval across current course source chunks; include lesson/course filters or priority when lesson context exists.
- Bound number/size of returned chunks and retain source/chunk IDs.
- Do not call an intent classifier or LLM reranker.

## Acceptance criteria

- [ ] Cross-course chunks cannot leak.
- [ ] Lesson chat tends to include relevant lesson concept chunks while still allowing broader course retrieval.
- [ ] Returned chunks preserve citation identifiers.

## Required tests

- Retrieval integration tests with seeded vectors/course isolation.

## Out of scope

- Answer generation/API.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
