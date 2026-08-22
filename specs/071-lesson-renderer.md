# 071 — Structured lesson renderer

## Goal

Implement one bounded V1 slice: **structured lesson renderer**.

## Depends on

- `049-lesson-content-zod-schema.md`
- `052-mermaid-block-rendering.md`
- `053-image-asset-handling.md`
- `070-roadmap-ui.md`

## Requirements

- Implement renderer for all lesson block types using reusable design-system components.
- Use react-markdown for Markdown fields and Shiki for code highlighting.
- Resolve image asset IDs through API/data layer.
- Support notes/bookmarks hooks and lesson chat entry point without cluttering reading flow.

## Acceptance criteria

- [ ] Every valid block type renders.
- [ ] Unknown invalid data is blocked by API/shared contract and has safe fallback.
- [ ] Reading layout stays focused/responsive.

## Required tests

- Component tests per block type; visual Playwright smoke later.

## Out of scope

- Assessment/project/chat screens.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
