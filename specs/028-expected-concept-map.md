# 028 — Expected concept map generation

## Goal

Implement one bounded V1 slice: **expected concept map generation**.

## Depends on

- `024-litellm-client.md`

## Requirements

- Define structured output contract for topic concept inventory before web research.
- Prompt LLM for concepts necessary to achieve the user’s learning goal, including fundamentals that docs may omit.
- Attach importance/depth/context metadata without deriving prerequisites yet.
- Persist/return data in a form compatible with course concept creation.

## Acceptance criteria

- [ ] Output validates strictly.
- [ ] Concept list is bounded/deduplicated and does not contain obvious formatting duplicates.
- [ ] No source-derived assumptions are required at this stage.

## Required tests

- Contract/normalization unit tests; golden Redis-topic structured-output fixture using mocked LLM.

## Out of scope

- Prerequisite graph creation is next spec.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
