# 066 — Per-lesson question job and assessment population

## Goal

Implement one bounded V1 slice: **one question job populates one ready lesson assessment**.

## Depends on

- `010-generation-job-state-machine.md`
- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`
- `020-worker-polling.md`
- `022-worker-retries.md`
- `046-assessment-skeletons.md`
- `056-lesson-job-integration.md`
- `061-question-schema.md`
- `062-question-generator.md`
- `063-question-validation.md`

## Requirements

- A `question` job targets exactly one `assessment_id` belonging to one ready lesson.
- Question jobs are enqueued by successful lesson jobs, so Lesson 1 assessment can become available while later lessons are still generating.
- Generate and validate the full question set for that assessment, then populate `questions`, `question_concepts`, and `assessment_questions` atomically.
- On QC failure regenerate the full assessment question set once; second failure marks that question job failed.
- Failed lesson assessments remain unavailable because no question job is created.
- Keep course/lesson usable if a question job fails; course eventually resolves to `ready_with_gaps` if the gap remains terminal.
- Handler is idempotent: retries/manual retry reuse the same job and cannot duplicate question rows/relations.

## Acceptance criteria

- [ ] A ready lesson can receive an available assessment before unrelated lessons finish.
- [ ] Exactly one question job exists per assessment despite worker retries/concurrency.
- [ ] Successful job populates only its target assessment.
- [ ] Failed question job does not invalidate course lessons/projects.
- [ ] Milestone integration gate passes: ready lesson → question job → populated assessment.

## Required tests

- Worker pipeline test with concurrent lesson completion, mixed ready/failed lessons, question retry, and duplicate enqueue race.

## Out of scope

- Assessment UI/scoring submission endpoints.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
