# 035 — Source cleaning, semantic chunking, tagging

## Goal

Implement one bounded V1 slice: **source cleaning, semantic chunking, tagging**.

## Depends on

- `034-source-crawling.md`

## Requirements

- Convert crawled Markdown into bounded chunks preserving headings/section context.
- Tag chunks with concept candidates/content roles when deterministically inferable; allow later LLM concept mapping.
- Remove navigation/boilerplate/duplicate chunks.
- Store chunk text and metadata in `source_chunks`.

## Acceptance criteria

- [ ] Chunks preserve enough heading/source context to cite/retrieve meaningfully.
- [ ] Large pages are bounded; tiny adjacent fragments are not over-split.
- [ ] Duplicate boilerplate does not dominate stored chunks.

## Required tests

- Unit tests over representative Markdown fixtures; integration insert test.

## Out of scope

- Embedding and final concept classification.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
