# 012 — LLM call tracking schema and helper

## Goal

Implement one bounded V1 slice: **llm call tracking schema and helper**.

## Depends on

- `006-drizzle-foundation.md`
- `009-generation-jobs-schema.md`
- `011-chat-progress-schema.md`

## Requirements

- Add `llm_calls` table with job_id nullable, model, prompt_version, input_tokens, output_tokens, latency_ms, cost_usd, raw_request_id, metadata/timestamps.
- Add `chat_messages.llm_call_id` FK.
- Create shared instrumentation helper in `packages/llm` that records calls without coupling call sites to SQL details.

## Acceptance criteria

- [ ] Every instrumented LLM request can persist token/latency/cost/model metadata.
- [ ] Chat messages can reference the exact LLM call.
- [ ] Failed logging must not silently corrupt the primary generation result; define/log policy.

## Required tests

- Instrumentation unit test with mocked model response; DB integration test for chat FK.

## Out of scope

- Analytics dashboard.
- External observability stack.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
