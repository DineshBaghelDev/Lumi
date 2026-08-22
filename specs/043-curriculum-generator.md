# 043 — Curriculum generation

## Goal

Implement one bounded V1 slice: **curriculum generation**.

## Depends on

- `024-litellm-client.md`
- `037-concept-source-mapping.md`
- `038-coverage-gap-detection.md`
- `041-research-job-integration.md`
- `042-curriculum-schema.md`

## Requirements

- Generate fixed curriculum from final research outputs, concept graph, source packs, topic, and user goal.
- Prefer causal storyline where natural while preserving prerequisite correctness.
- Keep important basics; do not omit content because it seems familiar.
- Group concepts into coherent modules/lessons without arbitrary chapter-size targets.
- Identify where guided projects meaningfully reinforce implementation.

## Acceptance criteria

- [ ] Output validates against curriculum schema.
- [ ] Every required/high-priority concept maps to at least one lesson objective or explicit justified treatment.
- [ ] No curriculum mutation behavior based on future assessments is introduced.

## Required tests

- Mocked LLM golden Redis-topic curriculum fixture; contract validation.

## Out of scope

- Skeleton DB writes and validation policy next.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
