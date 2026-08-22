# 024 — LiteLLM client and provider abstraction

## Goal

Implement one bounded V1 slice: **litellm client and provider abstraction**.

## Depends on

- `002-env-config.md`
- `003-docker-services.md`
- `012-llm-calls-tracking.md`

## Requirements

- Create typed LiteLLM HTTP client in `packages/llm`.
- Support OpenAI as primary while keeping model/provider selection configuration-driven.
- Support structured-output calls, streaming calls, and normal completion calls needed by later specs.
- Integrate LLM call tracking helper.

## Acceptance criteria

- [ ] Callers do not import provider-specific SDKs.
- [ ] Mocked normal/structured/streaming calls work through one package.
- [ ] Model/token/latency/cost metadata can be logged.

## Required tests

- Unit tests with mocked LiteLLM endpoint.

## Out of scope

- Prompt content for product features.
- Complex router/fallback policy beyond LiteLLM config.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
