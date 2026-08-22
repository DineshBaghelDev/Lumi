# 069 — Generation progress and partial availability UI

## Goal

Implement one bounded V1 slice: **generation progress and partial availability UI**.

## Depends on

- `017-course-read-apis.md`
- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`
- `068-realtime-polling-progress.md`

## Requirements

- Build course generation view showing meaningful stages without clutter.
- Before curriculum, show research progress and useful waiting-state content.
- After curriculum, render full lesson roadmap immediately with pending/generating/ready/failed states.
- Ready lessons become clickable while others continue generating.
- Show assessment readiness independently for each ready lesson.
- Expose concise generation budget/usage state only when useful (near limit, exhausted, or details requested); avoid a noisy cost dashboard.
- Provide explicit `Cancel generation` action while generation is active, with confirmation and clear preservation semantics.
- Expose failed-job retry entry points.

## Acceptance criteria

- [ ] User never waits on a blank screen.
- [ ] Partial course content is navigable.
- [ ] A ready lesson can show `assessment preparing` while later lessons generate.
- [ ] Curriculum fatal failure, item-level failure, cancellation, and budget exhaustion render distinctly.
- [ ] Cancellation does not imply already-ready content is deleted.

## Required tests

- UI tests for stage/status/budget/cancel fixtures.

## Out of scope

- Roadmap polished view next.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
