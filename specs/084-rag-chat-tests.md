# 084 — RAG retrieval/chat integration tests

## Goal

Implement one bounded V1 slice: **rag retrieval/chat integration tests**.

## Depends on

- `076-rag-retrieval.md`
- `077-rag-chat-api.md`
- `078-rag-chat-streaming.md`
- `080-chat-citations.md`
- `081-api-integration-tests.md`

## Requirements

- Seed multiple courses/source chunks and exercise query→embedding→pgvector retrieval→chat persistence.
- Assert `chat_messages.citations` stores retrieved chunk IDs and each maps to a real source_chunk/source.
- Assert cross-course isolation and `llm_call_id` linkage.
- Test streaming completion/failure behavior.

## Acceptance criteria

- [ ] No citation references nonexistent or other-course chunks.
- [ ] Assistant messages link to llm_calls.
- [ ] Retrieval remains functional without LLM reranker/intent classifier.

## Required tests

- Dedicated integration suite in `apps/api/tests` with deterministic embeddings/fixtures.

## Out of scope

- Semantic answer-quality benchmarking.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
