# 009 — Generation job queue schema

## Goal

Implement one bounded V1 slice: **generation job queue schema**.

## Depends on

- `006-drizzle-foundation.md`
- `007-core-course-schema.md`
- `008-learning-content-schema.md`

## Requirements

- Add `generation_jobs` with: `id`, `course_id`, `type`, `status`, `progress`, `attempts`, `available_at`, `error`, `locked_at`, `locked_by`, timestamps, `metadata jsonb`, plus nullable `lesson_id`, `project_id`, and `assessment_id` targets.
- Support exactly `research | curriculum | lesson | project | question` job types.
- Status values are declared here and behavior is locked in `010-generation-job-state-machine.md`.
- Add indexes for worker claim queries, course/job status queries, and target lookups.
- Keep target columns explicit rather than hiding logical identity only inside JSON metadata.

## Acceptance criteria

- [ ] Migration applies.
- [ ] Queued jobs can be selected efficiently by availability/status.
- [ ] Lease fields support heartbeat and stale reclamation.
- [ ] Invalid job types/statuses are rejected.
- [ ] Target identifiers are queryable/indexable without JSON extraction.

## Required tests

- DB tests for status/type constraints and claim-relevant indexes/queries.

## Out of scope

- Lifecycle transitions/idempotency constraints, implemented in `010-generation-job-state-machine.md`.
- Worker polling/claim implementation.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
