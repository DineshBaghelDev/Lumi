# 024 — LiteLLM client and provider abstraction

## Goal

Implement one bounded V1 slice: **litellm client and provider abstraction**.

## Depends on

- `002-env-config.md`
- `003-docker-services.md`
- `012-llm-calls-tracking.md`

## Requirements

- Create typed LiteLLM HTTP client in `packages/llm`.
- Support codex-as-api as the primary development provider while keeping model/provider selection configuration-driven.
- Configure OpenRouter as the fallback provider.
- codex-as-api runs at `http://127.0.0.1:18080`, uses `/v1/chat/completions`, currently serves model `gpt-5.5`, and requires every request to include a system message.
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
- Redesigning LiteLLM integration beyond this provider configuration.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
