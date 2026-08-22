# 048 — Curriculum job integration

## Goal

Implement one bounded V1 slice: **curriculum job integration**.

## Depends on

- `018-course-status-state-machine.md`
- `019-generation-budget-invariants.md`
- `020-worker-polling.md`
- `022-worker-retries.md`
- `041-research-job-integration.md`
- `042-curriculum-schema.md`
- `043-curriculum-generator.md`
- `044-curriculum-validator.md`
- `045-module-lesson-skeletons.md`
- `046-assessment-skeletons.md`
- `047-project-skeletons.md`

## Requirements

- Implement curriculum job handler: load research outputs → budget check → generate → validate → persist curriculum/modules/lesson/assessment/project skeletons.
- On success enqueue exactly one lesson job per lesson and one project job per project using job uniqueness constraints.
- Question jobs are not created here; each successful lesson job later enqueues the question job for its assessment.
- On permanent failure mark course failed and enqueue nothing downstream.
- Write generation metadata and LLM call records.

## Acceptance criteria

- [ ] Valid research state produces visible skeleton and downstream lesson/project jobs.
- [ ] Curriculum failure is fatal and leaves no downstream lesson/project/question jobs.
- [ ] Retry does not duplicate skeletons or downstream jobs.
- [ ] Milestone integration gate passes: research fixture → curriculum skeleton → lesson/project jobs.

## Required tests

- Worker integration/pipeline tests for success, fatal failure, idempotent retry, and downstream job uniqueness.

## Out of scope

- Lesson/project generation.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
