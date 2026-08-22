# 044 — Curriculum completeness/order validator

## Goal

Implement one bounded V1 slice: **curriculum completeness/order validator**.

## Depends on

- `029-prerequisite-expansion.md`
- `038-coverage-gap-detection.md`
- `042-curriculum-schema.md`
- `043-curriculum-generator.md`

## Requirements

- Validate hard prerequisite ordering, coverage completeness, duplicated objectives/content intent, lesson/module ordering, source-pack availability, and project/assessment references.
- Distinguish hard_prerequisite from recommended_before/related.
- Return actionable failure reasons for one allowed curriculum generation repair/regeneration policy if defined by integration spec.

## Acceptance criteria

- [ ] Hard prerequisite violation fails.
- [ ] Repeated/omitted required concept is detected.
- [ ] Recommended ordering does not masquerade as hard dependency.
- [ ] Validator is deterministic where possible and bounded where LLM judgment is used.

## Required tests

- Unit tests with intentionally broken curriculum fixtures.

## Out of scope

- Lesson content QC.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
