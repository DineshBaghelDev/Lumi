# 079 — Course and lesson chat UI

## Goal

Implement one bounded V1 slice: **course and lesson chat ui**.

## Depends on

- `071-lesson-renderer.md`
- `077-rag-chat-api.md`
- `078-rag-chat-streaming.md`

## Requirements

- Build `/courses/:id/chat` and reusable floating lesson chat panel using same backend threads.
- Render streaming assistant messages and citation controls.
- Keep chat visually secondary inside lesson view so it does not disrupt reading.
- Handle loading, insufficient-source message, errors, retry.

## Acceptance criteria

- [ ] Course chat and lesson panel both work.
- [ ] Streaming renders incrementally.
- [ ] Conversation persists across navigation/reload.

## Required tests

- Component tests; Playwright RAG path later.

## Out of scope

- Voice/chat agents.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
