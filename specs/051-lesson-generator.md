# 051 — Structured lesson generator

## Goal

Implement one bounded V1 slice: **structured lesson generator**.

## Depends on

- `024-litellm-client.md`
- `049-lesson-content-zod-schema.md`
- `050-lesson-source-retrieval.md`

## Requirements

- Generate complete lesson JSON from skeleton, source context, prerequisites, user/course goal, and learning rules.
- Use causal storyline when natural.
- Cover what/why/how/when/implementation/tradeoffs/failure modes/decisions as applicable.
- Teach commands/folder structure/files when first relevant.
- Avoid redundancy, AI filler, and robotic tone.
- Reference stored assets or request lesson asset creation through defined helper when an image materially helps.

## Acceptance criteria

- [ ] Generated output validates against Zod.
- [ ] All lesson objectives are explicitly addressed.
- [ ] Required prerequisites are taught, referenced as previously covered, or explicitly assumed.
- [ ] No raw arbitrary HTML/layout control is generated.

## Required tests

- Mocked LLM structured-output fixture and objective coverage checks.

## Out of scope

- QC/regeneration persistence next.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
