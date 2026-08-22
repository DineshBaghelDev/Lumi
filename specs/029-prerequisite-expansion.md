# 029 — Prerequisite expansion

## Goal

Implement one bounded V1 slice: **prerequisite expansion**.

## Depends on

- `028-expected-concept-map.md`

## Requirements

- Given expected concepts, generate only prerequisites needed to reason about the target topic.
- Classify dependency edges as hard_prerequisite, recommended_before, or related.
- Apply bounded recursion/depth policy to avoid infinite foundational expansion.
- Normalize/deduplicate concepts introduced through prerequisites.

## Acceptance criteria

- [ ] Graph has no self edges and hard-prerequisite cycles are detected/rejected or repaired.
- [ ] Redis-like topics can introduce required networking/memory concepts without expanding into an entire CS degree.
- [ ] Typed edge semantics are preserved.

## Required tests

- Graph validation unit tests including cycles, duplicates, depth cap.

## Out of scope

- Curriculum ordering.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
