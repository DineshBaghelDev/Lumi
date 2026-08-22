# 047 — Create project and milestone skeletons

## Goal

Implement one bounded V1 slice: **create project and milestone skeletons**.

## Depends on

- `008-learning-content-schema.md`
- `042-curriculum-schema.md`
- `045-module-lesson-skeletons.md`

## Requirements

- Persist projects chosen by curriculum plus milestone titles/order/concept and lesson mappings.
- Store only skeleton/outline fields needed by later project job; full scenario/hints are generated later.
- Ensure project jobs can be enqueued independently and retried.

## Acceptance criteria

- [ ] Curriculum roadmap can show project checkpoints before full project content is ready.
- [ ] Every skeleton has deterministic project/milestone IDs/order and mappings.
- [ ] Retry does not duplicate projects/milestones.

## Required tests

- DB integration test for skeleton idempotency/mappings.

## Out of scope

- Full project content.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
