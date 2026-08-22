# 018 — Course status state machine

## Goal

Implement one bounded V1 slice: **course status state machine**.

## Depends on

- `007-core-course-schema.md`
- `009-generation-jobs-schema.md`
- `010-generation-job-state-machine.md`
- `015-post-courses-stub.md`

## Requirements

- Define one centralized service/function that derives/applies `courses.status` from research/curriculum/content job states and explicit cancellation.
- Support exactly: `generating | ready | ready_with_gaps | failed | cancelled | archived`.
- `failed`: research/curriculum terminal failure prevents a usable course skeleton.
- `cancelled`: generation was explicitly cancelled or stopped by a hard generation budget; already-ready content remains readable.
- `generating`: curriculum exists or generation is underway and at least one non-cancelled generation job remains `queued | running`.
- `ready`: no active generation jobs remain; all required lessons are ready; each ready required lesson has a succeeded question job/available assessment; project jobs required by the generated course completed successfully.
- `ready_with_gaps`: no active generation jobs remain, curriculum exists, and one or more nonfatal lesson/project/question jobs failed or were cancelled.
- Lesson/project/question failures never force `failed` once a valid curriculum exists.
- Prevent arbitrary handlers from writing ad-hoc status values outside this service.

## Acceptance criteria

- [ ] Status for every relevant job-state combination is deterministic.
- [ ] Research/curriculum failure cannot produce ready/ready_with_gaps.
- [ ] Active partial generation remains `generating` while ready lessons are still usable.
- [ ] A per-lesson question failure produces a gap without invalidating the ready lesson.
- [ ] Cancelled generation preserves readable completed content.

## Required tests

- Table-driven unit tests for state combinations and transitions, including per-lesson question jobs and cancellation.

## Out of scope

- Frontend status display.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
