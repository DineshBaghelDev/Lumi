# 016 — Course owner enrollment creation

## Goal

Implement one bounded V1 slice: **course owner enrollment creation**.

## Depends on

- `007-core-course-schema.md`
- `015-post-courses-stub.md`

## Requirements

- Extend course creation transaction to create owner enrollment row with correct role/status/start metadata.
- Ensure course access checks work immediately after creation.
- Define behavior if enrollment insertion fails: entire course/job transaction rolls back.

## Acceptance criteria

- [ ] `POST /courses` yields course + research job + exactly one owner enrollment.
- [ ] Non-owner has no access by default.
- [ ] Partial creation cannot persist when enrollment creation fails.

## Required tests

- API transaction test including forced enrollment failure.

## Out of scope

- Course sharing/invites.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
