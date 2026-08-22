# 032 — Official and primary source protection

## Goal

Implement one bounded V1 slice: **official and primary source protection**.

## Depends on

- `025-searxng-client.md`
- `031-source-filtering.md`

## Requirements

- Implement verification signals for official docs/repos/specs using deterministic/cross-link metadata available from search/crawl results.
- Maintain protected source family metadata so official sources bypass early relevance cutoffs.
- Allow ranking among pages within the protected family.
- Persist reason for protection/authority classification.

## Acceptance criteria

- [ ] Official source family cannot be entirely filtered because snippets rank poorly.
- [ ] Unverified random domain is not automatically treated as official from name similarity alone.
- [ ] Protection metadata is available to later source scoring.

## Required tests

- Fixture tests for official, ambiguous, and spoof-like candidates.

## Out of scope

- Manual domain curation UI.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
