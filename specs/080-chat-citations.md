# 080 — Citation display and source resolution

## Goal

Implement one bounded V1 slice: **citation display and source resolution**.

## Depends on

- `077-rag-chat-api.md`
- `079-rag-chat-ui.md`

## Requirements

- Implement API/client resolution from stored chat citation chunk IDs to source title/URL/relevant metadata.
- Display concise citation chips/details without exposing internal embeddings/raw storage paths.
- Handle missing/deleted source gracefully.

## Acceptance criteria

- [ ] Every displayed citation maps to a real source_chunk/source when present.
- [ ] No fabricated citation IDs can render as valid.
- [ ] User can inspect source identity/context from chat answer.

## Required tests

- API integration and UI tests for valid/missing citations.

## Out of scope

- External bibliography manager.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
