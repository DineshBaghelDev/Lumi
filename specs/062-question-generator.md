# 062 — Generate post-lesson question candidates

## Goal

Implement one bounded V1 slice: **generate post-lesson question candidates for one ready lesson assessment**.

## Depends on

- `024-litellm-client.md`
- `046-assessment-skeletons.md`
- `056-lesson-job-integration.md`
- `061-question-schema.md`

## Requirements

- Given one ready lesson + its pending assessment, generate more candidate questions than needed from that lesson's content, objectives, concepts, and source refs.
- Mix recall minimally with mechanism, reasoning, scenario, debugging, prediction, and pseudocode.
- Only require material actually taught in the target lesson or explicitly established prerequisites.
- Assign primary concept and additional concept mappings.
- Respect per-course generation budget before calling the model.

## Acceptance criteria

- [ ] Generated questions validate structurally.
- [ ] No question requires an untaught concept as necessary knowledge.
- [ ] Candidate pool has type/difficulty diversity without trivia-heavy bias.
- [ ] Generation is scoped to exactly one assessment/lesson.

## Required tests

- Mocked generation fixture per question family and per-assessment scoping test.

## Out of scope

- Validation/filtering next.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
