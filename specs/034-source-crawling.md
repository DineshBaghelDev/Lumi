# 034 — Selected source crawling and storage

## Goal

Implement one bounded V1 slice: **selected source crawling and storage**.

## Depends on

- `007-core-course-schema.md`
- `019-generation-budget-invariants.md`
- `026-crawl4ai-client.md`
- `031-source-filtering.md`
- `032-official-source-protection.md`
- `033-research-security-boundaries.md`

## Requirements

- Before Crawl4AI receives a URL, pass it through the research security URL/SSRF guard and course budget checks.
- Crawl selected URLs through Crawl4AI only after checking existing normalized `sources.url`.
- Revalidate redirects/resources according to `033-research-security-boundaries.md`.
- Enforce configured MIME, byte, redirect, and resource limits.
- Persist sanitized raw Markdown to InsForge Storage with metadata/storage path.
- Reuse existing source on idempotent retry rather than crawling again.
- Capture discovered image/link metadata as untrusted candidates for later processing; do not fetch/render them directly here.
- Store relevant crawl/security flags in `sources.research_metadata`.

## Acceptance criteria

- [ ] Retry of same research URL does not create duplicate source or redundant crawl under normal idempotent path.
- [ ] Raw Markdown is stored outside Postgres.
- [ ] Source row records storage path/file metadata, research metadata, and relevant security flags.
- [ ] Blocked/private/oversized/disallowed targets never reach normal persistence path.

## Required tests

- Worker integration test with mocked Crawl4AI/Storage, duplicate retry, and blocked/oversized source fixtures.

## Out of scope

- Chunking/embedding.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
