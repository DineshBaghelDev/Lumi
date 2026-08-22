# 042 — Curriculum structured-output contract

## Goal

Implement one bounded V1 slice: **curriculum structured-output contract**.

## Depends on

- `008-learning-content-schema.md`
- `028-expected-concept-map.md`
- `029-prerequisite-expansion.md`
- `037-concept-source-mapping.md`

## Requirements

- Define Zod structured-output contract for modules, lessons, objectives, required prerequisites, concept/source-pack references, assessment skeleton metadata, project skeleton/milestone outline metadata, and generation summary.
- Ensure lesson/module order indexes and required flags are explicit.
- Version contract if persisted structured curriculum payload requires it.

## Acceptance criteria

- [ ] Valid curriculum fixture parses.
- [ ] Missing objectives/order/prerequisite references fail validation.
- [ ] Contract contains enough data to create all required skeleton rows deterministically.

## Required tests

- Zod unit tests for valid/invalid fixtures.

## Out of scope

- Curriculum prompt/generation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
