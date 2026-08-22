# 073 — Guided project UI

## Goal

Implement one bounded V1 slice: **guided project ui**.

## Depends on

- `060-project-job-integration.md`
- `070-roadmap-ui.md`

## Requirements

- Build project route that shows one current milestone/scenario at a time.
- Show scenario/problem, learner decision prompt where applicable, local implementation goal, relevant lesson links, progressive hint action, and “I’m done”.
- Advance project progress after learner confirmation.
- No code editor, terminal, upload, or repo review UI.

## Acceptance criteria

- [ ] User can progress milestone by milestone.
- [ ] Hints reveal in intended order.
- [ ] Next constraint is not dumped before current milestone completion unless user navigates intentionally.

## Required tests

- Component/API integration tests for milestone progression/hints.

## Out of scope

- Automatic project assessment/review.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
