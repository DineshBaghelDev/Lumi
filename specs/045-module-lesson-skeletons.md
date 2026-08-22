# 045 — Persist module and lesson skeletons

## Goal

Implement one bounded V1 slice: **persist module and lesson skeletons**.

## Depends on

- `008-learning-content-schema.md`
- `042-curriculum-schema.md`
- `043-curriculum-generator.md`
- `044-curriculum-validator.md`

## Requirements

- Persist curriculum, ordered modules, and empty lesson rows from validated curriculum.
- Set lesson title/objectives/order/is_required/status=pending/source-pack references/required_prerequisites.
- Use transaction/idempotent upsert strategy suitable for curriculum job retries.
- Do not generate lesson content here.

## Acceptance criteria

- [ ] Roadmap can be read immediately after persistence.
- [ ] Retry cannot duplicate modules/lessons.
- [ ] Every lesson has enough input metadata for an independent lesson job.

## Required tests

- DB integration tests for ordering/idempotent retry.

## Out of scope

- Assessment/project skeletons separate specs.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
