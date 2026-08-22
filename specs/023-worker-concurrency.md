# 023 — Worker concurrency controls

## Goal

Implement one bounded V1 slice: **worker concurrency controls**.

## Depends on

- `020-worker-polling.md`
- `022-worker-retries.md`

## Requirements

- Allow bounded global worker concurrency.
- Enforce max 3 simultaneous lesson jobs per course.
- Do not require lesson order for generation.
- Ensure other job types are not starved by many lesson jobs.

## Acceptance criteria

- [ ] Course never has >3 running lesson jobs.
- [ ] Lesson 5 can run before lesson 4.
- [ ] Research/curriculum/project/question work remains claimable under lesson load.

## Required tests

- Concurrency integration test with multiple courses and job types.

## Out of scope

- Distributed rate-limit scheduler.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
