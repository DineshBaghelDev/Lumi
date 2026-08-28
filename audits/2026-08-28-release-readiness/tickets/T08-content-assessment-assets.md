# T08 — Repair content rendering, assessment UX, and asset delivery

## Problem
Lesson Markdown/Shiki support and image delivery are incomplete; assessment network failures can lock incorrect answers and history is unclear; deterministic asset paths are not uploaded.

## Scope
Write only lesson/assessment/project web components, `apps/web/src/app/courses/**`, lesson rendering helpers, and worker asset code/tests. Do not edit `apps/api/src/app.ts`.

## Acceptance
- Approved lesson Markdown/code rendering and source links work with safe fallbacks.
- Lesson image assets resolve to actual uploaded objects or the UI gives an honest unavailable state.
- Assessment network failures do not mark answers wrong; retries are safe and prior attempts are visible/resumable.
- Focused tests/typechecks pass.
