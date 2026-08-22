# 053 — Lesson image asset generation/reuse

## Goal

Implement one bounded V1 slice: **lesson image asset generation/reuse**.

## Depends on

- `040-research-assets.md`
- `049-lesson-content-zod-schema.md`
- `050-lesson-source-retrieval.md`
- `051-lesson-generator.md`

## Requirements

- Decide image need from lesson semantic purpose, preferring stored trusted source images when suitable.
- Create/retrieve lesson asset with title, description, alt text, storage path, provenance metadata.
- Store generated/fetched image file in InsForge Storage and asset row in Postgres.
- Lesson content references only assetId.
- Make operation idempotent across lesson job retry.

## Acceptance criteria

- [ ] Lesson image resolves from assetId to stored file metadata.
- [ ] Retry does not create duplicate assets for same generation attempt/key.
- [ ] Source/generated provenance is distinguishable.

## Required tests

- Worker asset integration test with mocked generation/source image and Storage.

## Out of scope

- Image-generation provider choice beyond model gateway config.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
