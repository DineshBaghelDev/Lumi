# 072 — Assessment serving and UI

## Goal

Implement one bounded V1 slice: **assessment serving and ui**.

## Depends on

- `046-assessment-skeletons.md`
- `061-question-schema.md`
- `064-objective-question-scoring.md`
- `065-free-response-scoring.md`
- `066-question-job-integration.md`

## Requirements

- Implement API/data flow to serve one assessment question at a time without exposing answer keys/rubrics.
- Build renderer components for all question types.
- MCQ provides immediate feedback; all other types defer scoring until final submission.
- Submit attempt and show exact weak-area guidance after grading.

## Acceptance criteria

- [ ] Answer keys never appear in client payload before scoring.
- [ ] MCQ feedback timing matches locked rule.
- [ ] Final submission persists attempt/results and produces guidance.

## Required tests

- API integration tests for secure serving/submission; UI tests for each renderer.

## Out of scope

- Pre-course diagnostic.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
