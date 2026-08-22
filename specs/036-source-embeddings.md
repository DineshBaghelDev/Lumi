# 036 — Source chunk embeddings

## Goal

Implement one bounded V1 slice: **source chunk embeddings**.

## Depends on

- `027-tei-embedding-client.md`
- `035-source-chunking.md`

## Requirements

- Batch embed stored source chunks with TEI.
- Persist vector(384), embedding_model, embedding_version.
- Skip already-current embeddings on idempotent retry.
- Expose helper for concept/query similarity against chunks.

## Acceptance criteria

- [ ] Every eligible new chunk gets a valid 384-dim embedding.
- [ ] Retry does not recompute unchanged current embeddings.
- [ ] Similarity query uses cosine semantics consistent with HNSW index.

## Required tests

- Embedding integration test with mock TEI + pgvector similarity fixture.

## Out of scope

- RAG chat retrieval.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
