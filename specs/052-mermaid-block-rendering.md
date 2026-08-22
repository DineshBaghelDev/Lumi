# 052 — Mermaid lesson block renderer

## Goal

Implement one bounded V1 slice: **mermaid lesson block renderer**.

## Depends on

- `049-lesson-content-zod-schema.md`

## Requirements

- Implement client component for safe Mermaid block rendering from validated content.
- Provide loading/error fallback that preserves diagram source/caption without breaking lesson.
- Keep styling consistent with light design system and responsive reading layout.

## Acceptance criteria

- [ ] Valid diagram renders.
- [ ] Invalid Mermaid fails locally with readable fallback rather than crashing page.
- [ ] Renderer does not execute arbitrary untrusted scripts.

## Required tests

- Component/unit test for valid/invalid blocks; visual/E2E smoke where appropriate.

## Out of scope

- Mermaid generation QC beyond lesson validator.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
