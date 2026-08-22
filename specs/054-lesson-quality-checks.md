# 054 — Lesson quality-control gates

## Goal

Implement one bounded V1 slice: **lesson quality-control gates**.

## Depends on

- `024-litellm-client.md`
- `049-lesson-content-zod-schema.md`
- `051-lesson-generator.md`

## Requirements

- Implement QC for schema validity, objective coverage, source grounding, prerequisite treatment, redundancy, code/example consistency, tone/depth rules.
- Use deterministic checks where possible and one separate reviewer LLM pass for semantic/pedagogical checks.
- Produce explicit pass/fail reasons rather than opaque overall score.
- Keep formal Promptfoo/Ragas frameworks out of V1.

## Acceptance criteria

- [ ] A lesson missing an objective or prerequisite fails.
- [ ] Unsupported important claims can be identified/flagged.
- [ ] Obvious repeated filler fails redundancy/tone rules.
- [ ] Passing lesson returns machine-readable QC result.

## Required tests

- Unit tests for deterministic gates; mocked reviewer fixtures for pass/fail cases.

## Out of scope

- Regeneration policy next.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
