# 046 — Create assessment skeletons

## Goal

Implement one bounded V1 slice: **create assessment skeletons**.

## Depends on

- `008-learning-content-schema.md`
- `042-curriculum-schema.md`
- `045-module-lesson-skeletons.md`

## Requirements

- Create one assessment skeleton per lesson during curriculum persistence.
- Link assessment to lesson/course and mark unavailable/pending until questions exist.
- Keep assessment creation idempotent.

## Acceptance criteria

- [ ] Every lesson has exactly one intended V1 post-lesson assessment skeleton.
- [ ] Failed/unready lesson assessment remains unavailable.
- [ ] Retry does not duplicate assessments.

## Required tests

- DB integration tests for one-to-one lesson assessment behavior.

## Out of scope

- Question generation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
