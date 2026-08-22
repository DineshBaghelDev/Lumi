# 061 — Question and scoring contracts

## Goal

Implement one bounded V1 slice: **question and scoring contracts**.

## Depends on

- `008-learning-content-schema.md`

## Requirements

- Implement shared Zod contracts for all V1 question types.
- Define type-specific prompt/options/payload, answer key, rubric, difficulty, source refs, primary concept, and generation metadata.
- Keep implementation/mini-project question types out of scored assessments.

## Acceptance criteria

- [ ] All eight supported types validate.
- [ ] Invalid/missing type-specific fields fail.
- [ ] Free-response rubrics have explicit expected points/criteria.

## Required tests

- Question contract unit tests.

## Out of scope

- Question generation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
