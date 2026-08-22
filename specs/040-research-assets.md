# 040 — Research image asset ingestion

## Goal

Implement one bounded V1 slice: **research image asset ingestion**.

## Depends on

- `033-research-security-boundaries.md`
- `034-source-crawling.md`
- `037-concept-source-mapping.md`

## Requirements

- Evaluate crawled image candidates using source authority, concept/section relevance, basic file validity, and metadata.
- Pass every image URL through the same outbound URL/SSRF, redirect, byte, and MIME checks used for research resources.
- Disallow unsafe active formats in V1 (including unsanitized SVG).
- Store retained source images in InsForge Storage; never rely on arbitrary remote image URLs at render time.
- Create `assets` rows with title, description, alt text, concepts/metadata, source URL/source ID, size/mime/path.
- Avoid storing decorative, duplicate, low-value, or security-rejected images.

## Acceptance criteria

- [ ] Retained image has valid Storage object and matching asset row.
- [ ] Asset metadata supports later lesson retrieval by concept/purpose.
- [ ] Duplicate image candidates are not stored repeatedly.
- [ ] Private/unsafe/oversized image targets are rejected before storage.

## Required tests

- Asset integration test with valid, duplicate, private-URL, oversized, and disallowed-MIME fixtures.

## Out of scope

- Generated lesson images.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
