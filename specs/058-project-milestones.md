# 058 — Generate full milestone scenarios and outcomes

## Goal

Implement one bounded V1 slice: **generate full milestone scenarios and outcomes**.

## Depends on

- `047-project-skeletons.md`
- `057-project-generation.md`

## Requirements

- Populate milestone scenario/context, learner decision prompt when useful, implementation goal, constraints, expected outcome, and relevant lesson links.
- Introduce only a small number of new ideas per milestone.
- Reveal next milestone limitation progressively rather than dumping the entire project upfront.

## Acceptance criteria

- [ ] Every milestone has enough context for a beginner to attempt locally.
- [ ] Milestone order follows learning dependencies.
- [ ] Project ends in a meaningful integrated system rather than disconnected exercises.

## Required tests

- Project milestone validation/golden fixture tests.

## Out of scope

- Hints are separate.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
