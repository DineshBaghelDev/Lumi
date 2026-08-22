# 068 — Realtime generation updates with polling fallback

## Goal

Implement one bounded V1 slice: **realtime generation updates with polling fallback**.

## Depends on

- `004-insforge-client.md`
- `009-generation-jobs-schema.md`
- `017-course-read-apis.md`

## Requirements

- Implement client data layer that subscribes to relevant InsForge Realtime course/job changes.
- Poll course detail/jobs every 5 seconds as fallback while generation is active.
- Reconcile both paths into TanStack Query cache without duplicate UI side effects.
- Stop unnecessary polling/subscriptions when course becomes terminal/idle or component unmounts.

## Acceptance criteria

- [ ] UI updates when realtime event arrives.
- [ ] If realtime is unavailable, state updates within polling interval.
- [ ] No duplicate notifications/transitions from receiving same state through both channels.

## Required tests

- Unit/integration tests with mocked realtime and timers.

## Out of scope

- Visual progress screen next.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
