# 077 — RAG chat API and persistence

## Goal

Implement one bounded V1 slice: **rag chat api and persistence**.

## Depends on

- `012-llm-calls-tracking.md`
- `014-auth-middleware.md`
- `024-litellm-client.md`
- `076-rag-retrieval.md`

## Requirements

- Implement `POST /courses/:id/chat` with optional thread/lesson context.
- Authorize enrollment, retrieve chunks, call LiteLLM, persist user/assistant messages, citations, model, llm_call_id.
- Answer directly and disclose insufficient course evidence when retrieval is weak.
- Support creating/reusing chat thread.

## Acceptance criteria

- [ ] Assistant message citations contain real retrieved source chunk IDs.
- [ ] Every assistant model response links to llm_calls.
- [ ] Unauthorized course access is denied.

## Required tests

- API integration test with mocked embedding/retrieval/LLM and persistence.

## Out of scope

- Streaming transport next.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
