# 064 — Deterministic objective scoring

## Goal

Implement one bounded V1 slice: **deterministic objective scoring**.

## Depends on

- `061-question-schema.md`

## Requirements

- Implement scoring for MCQ, fill_blank, matching, and any prediction form that has deterministically comparable output.
- Normalize case/whitespace/accepted variants only where contract allows.
- Return correctness plus structured feedback metadata.

## Acceptance criteria

- [ ] Scoring is deterministic and does not call an LLM.
- [ ] Accepted variants do not create false negatives.
- [ ] Clearly wrong answers are not accepted through overly loose normalization.

## Required tests

- Unit tests for every deterministic question type and edge cases.

## Out of scope

- Free-response scoring.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
