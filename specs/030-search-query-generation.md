# 030 — Research search query generation

## Goal

Implement one bounded V1 slice: **research search query generation**.

## Depends on

- `024-litellm-client.md`
- `028-expected-concept-map.md`
- `029-prerequisite-expansion.md`

## Requirements

- Generate query families from topic, goal, concepts, and prerequisites.
- Include queries for official docs/specs/repos, internals/mechanisms, implementation, failure modes, tradeoffs, and production engineering where relevant.
- Bound query count and deduplicate semantically redundant queries.

## Acceptance criteria

- [ ] Each high-priority concept is represented by at least one appropriate query family or explicit rationale.
- [ ] Query count respects configured bound.
- [ ] Output validates as structured data.

## Required tests

- Unit tests for dedupe/bounds and mocked Redis-topic query fixture.

## Out of scope

- Executing search.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
