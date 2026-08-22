# 037 — Source-derived concept mapping and source packs

## Goal

Implement one bounded V1 slice: **source-derived concept mapping and source packs**.

## Depends on

- `024-litellm-client.md`
- `028-expected-concept-map.md`
- `029-prerequisite-expansion.md`
- `035-source-chunking.md`
- `036-source-embeddings.md`

## Requirements

- Map chunks/sources to expected and newly discovered concepts using compressed relevant evidence, not full-site prompts.
- Persist `concept_sources` relationships with relevance/authority/depth metadata.
- Identify novel meaningful concepts found in sources and merge carefully into concept inventory.
- Build ranked candidate source pack per concept.

## Acceptance criteria

- [ ] Each mapping references real source/chunk evidence.
- [ ] Concept duplicates are normalized.
- [ ] High-priority concepts expose ranked source candidates for coverage evaluation.

## Required tests

- Unit tests for mapping normalization; mocked LLM mapping fixture.

## Out of scope

- Coverage-gap loop.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
