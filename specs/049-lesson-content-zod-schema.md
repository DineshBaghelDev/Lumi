# 049 — Versioned lesson content contract

## Goal

Implement one bounded V1 slice: **versioned lesson content contract**.

## Depends on

- `008-learning-content-schema.md`

## Requirements

- Implement `LessonContent` Zod schema in `packages/shared` with schemaVersion and stable block IDs.
- Support heading, paragraph, list, code, callout, mermaid, image(assetId) blocks.
- Attach source refs to factual text/code/diagram blocks as appropriate.
- Provide JSON Schema export if needed for structured LLM output.

## Acceptance criteria

- [ ] Valid fixtures parse and render-contract types infer from Zod.
- [ ] Unknown/malformed block type fails.
- [ ] Image blocks require assetId and contain no permanent storage URL.
- [ ] Mermaid is a formal first-class type.

## Required tests

- Comprehensive schema unit tests.

## Out of scope

- Renderer implementation.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
