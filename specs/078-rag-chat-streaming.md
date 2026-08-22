# 078 — Fastify chat streaming

## Goal

Implement one bounded V1 slice: **fastify chat streaming**.

## Depends on

- `024-litellm-client.md`
- `077-rag-chat-api.md`

## Requirements

- Stream LLM response from API to Next.js-compatible client transport.
- Persist final assembled assistant message and metadata after stream completion.
- Handle client disconnect/model failure without leaving invalid completed chat state.
- Preserve citation metadata independent of token stream.

## Acceptance criteria

- [ ] Client receives incremental content.
- [ ] Successful stream persists exact final response.
- [ ] Interrupted stream has defined recoverable message state/logging.

## Required tests

- API streaming integration tests with mocked stream/disconnect.

## Out of scope

- Web chat presentation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
