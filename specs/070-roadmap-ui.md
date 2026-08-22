# 070 — Course roadmap UI

## Goal

Implement one bounded V1 slice: **course roadmap ui**.

## Depends on

- `017-course-read-apis.md`
- `045-module-lesson-skeletons.md`
- `046-assessment-skeletons.md`
- `047-project-skeletons.md`
- `069-generation-progress-ui.md`

## Requirements

- Build clean module/lesson roadmap on course page.
- Show ordered modules, lesson status, required/optional indicator where needed, project checkpoints, assessment availability, and concise progress.
- Avoid dense dashboard panels and keep primary next action obvious.

## Acceptance criteria

- [ ] Ordering matches database order_index.
- [ ] Ready/failed/skipped/completed states are visually distinct but restrained.
- [ ] Project/assessment links appear only when usable.

## Required tests

- Component tests with representative course fixture.

## Out of scope

- Lesson rendering.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
