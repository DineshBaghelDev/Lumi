# 065 — Rubric-based free-response scoring

## Goal

Implement one bounded V1 slice: **rubric-based free-response scoring**.

## Depends on

- `024-litellm-client.md`
- `061-question-schema.md`

## Requirements

- Implement LLM grading for short_answer, scenario, identify_issue, and pseudocode where deterministic grading is insufficient.
- Grade against stored rubric/expected points, ignoring pseudocode syntax where logic is correct.
- Return score, criteria-level result, exact weak/missing points, and concise feedback.
- Instrument call through `llm_calls`.

## Acceptance criteria

- [ ] Grader output is strict/validated structured data.
- [ ] Equivalent correct reasoning can receive credit without exact wording.
- [ ] Feedback identifies concrete conceptual gaps rather than generic prose.

## Required tests

- Mocked rubric grading tests including equivalent pseudocode answers.

## Out of scope

- Advanced calibration/human benchmarking.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
