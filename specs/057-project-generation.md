# 057 — Guided project content generation

## Goal

Implement one bounded V1 slice: **guided project content generation**.

## Depends on

- `024-litellm-client.md`
- `047-project-skeletons.md`
- `048-curriculum-job-integration.md`

## Requirements

- Generate project-level storyline/premise and teaching progression from project skeleton, curriculum, covered concepts, and lesson mappings.
- Use progressive constraints: problem → learner choice → local implementation → new limitation.
- Prefer realistic mission/story framing; fantasy flavor may be light but must not obscure engineering.
- Produce structured project content compatible with milestone schema.

## Acceptance criteria

- [ ] Project teaches implementation rather than testing competence.
- [ ] Generated storyline uses only concepts intended by curriculum/project mappings.
- [ ] No in-app IDE/repo-review assumptions are introduced.

## Required tests

- Mocked LLM project fixture and contract validation.

## Out of scope

- Detailed milestone generation next.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
