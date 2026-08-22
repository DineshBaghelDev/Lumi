# 083 — Research and lesson asset tests

## Goal

Implement one bounded V1 slice: **research and lesson asset tests**.

## Depends on

- `040-research-assets.md`
- `053-image-asset-handling.md`
- `056-lesson-job-integration.md`
- `082-worker-pipeline-tests.md`

## Requirements

- Add explicit assertions for scraped research images and lesson-generated/reused images.
- Verify files land in InsForge Storage abstraction/test double with correct `assets` rows/provenance/mime/size/path.
- Verify lesson image block resolves correct asset row and retries remain idempotent.

## Acceptance criteria

- [ ] Both source_image and generated_image paths are covered.
- [ ] Asset row without storage object or storage object without expected row fails test.
- [ ] Duplicate retry does not create extra assets.

## Required tests

- Worker integration tests focused on asset lifecycle.

## Out of scope

- Image visual-quality benchmarking.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
