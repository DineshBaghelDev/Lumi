# 063 — Question correctness, ambiguity, duplicate validation

## Goal

Implement one bounded V1 slice: **question correctness, ambiguity, duplicate validation**.

## Depends on

- `024-litellm-client.md`
- `061-question-schema.md`
- `062-question-generator.md`

## Requirements

- Validate answer correctness/source support, taught-material scope, ambiguity, rubric/prompt consistency, and semantic duplicates.
- Use deterministic normalization/duplicate checks first and bounded reviewer LLM where semantic judgment is needed.
- Select final ordered question set per lesson assessment.

## Acceptance criteria

- [ ] Unsupported or ambiguous candidates are rejected.
- [ ] Near-duplicate questions do not fill the final assessment.
- [ ] Final question set references valid ready lesson/source concepts.

## Required tests

- Validator unit tests plus mocked reviewer fixtures.

## Out of scope

- Scoring.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
