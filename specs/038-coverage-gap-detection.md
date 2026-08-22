# 038 — Concept coverage and edge-case detection

## Goal

Implement one bounded V1 slice: **concept coverage and edge-case detection**.

## Depends on

- `024-litellm-client.md`
- `028-expected-concept-map.md`
- `029-prerequisite-expansion.md`
- `037-concept-source-mapping.md`

## Requirements

- Compare expected/prerequisite concepts with source-derived coverage.
- Classify each required concept as covered, weakly_covered, or explicitly_unresolved candidate.
- Run compressed LLM edge-case review for incomplete docs, hidden prerequisites, conflicts, versions, shallow repetition, ambiguous terms, undocumented important behavior.
- Persist confidence/gap analysis in concept/source research metadata.

## Acceptance criteria

- [ ] Every required concept receives a coverage state/confidence.
- [ ] Weak coverage reasons identify what targeted search should seek.
- [ ] Conflicting/versioned evidence is surfaced rather than averaged away.

## Required tests

- Coverage classification tests using curated fixture metadata/chunks.

## Out of scope

- Executing targeted search.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
