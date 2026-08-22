# 074 — Progress mutation and resume behavior

## Goal

Implement one bounded V1 slice: **progress mutation and resume behavior**.

## Depends on

- `011-chat-progress-schema.md`
- `017-course-read-apis.md`
- `070-roadmap-ui.md`
- `071-lesson-renderer.md`
- `072-assessment-ui.md`
- `073-project-ui.md`

## Requirements

- Implement lesson status/current block updates, concept guidance updates from assessment results, project milestone progress, and course completion calculation.
- Course completion derives from required lessons completed or skipped; do not store mutable percentage as truth.
- Resolve resume target from last active lesson/block and unfinished project/assessment state.

## Acceptance criteria

- [ ] Skipping a lesson does not mark its concepts strong.
- [ ] Assessment failures can set needs_guidance without modifying curriculum.
- [ ] Resume opens the correct meaningful continuation point.

## Required tests

- Unit tests for completion/resume/guidance transitions; API integration tests for progress writes.

## Out of scope

- Adaptive curriculum.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
