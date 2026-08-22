# 026 — Crawl4AI client

## Goal

Implement one bounded V1 slice: **crawl4ai client**.

## Depends on

- `002-env-config.md`
- `003-docker-services.md`

## Requirements

- Implement worker HTTP client for Crawl4AI.
- Support single/multi URL crawl request used by research pipeline.
- Normalize Markdown, metadata, links, images, status/errors.
- Configure practical timeouts/size bounds from env.

## Acceptance criteria

- [ ] Client yields stable crawled-page contract.
- [ ] Retryable crawl failures are distinguishable from permanent URL/content failures.
- [ ] Images/links metadata survive normalization.

## Required tests

- Unit tests with mocked crawl payloads/errors.

## Out of scope

- Source selection/chunking/storage.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
