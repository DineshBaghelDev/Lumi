# 067 — Course creation screen

## Goal

Implement one bounded V1 slice: **course creation screen**.

## Depends on

- `005-google-auth.md`
- `015-post-courses-stub.md`
- `016-enrollment-creation-flow.md`

## Requirements

- Build light-mode `/courses/new` screen using approved design system.
- Collect topic and V1 goal/depth fields only.
- Submit to `POST /courses`, handle loading/errors/idempotency, navigate to created course.
- Keep one dominant action and avoid CLI command language.

## Acceptance criteria

- [ ] Authenticated user can create course from UI.
- [ ] Repeated click/network retry does not create duplicate course via API idempotency.
- [ ] Error state is clear and recoverable.

## Required tests

- Component tests as needed; Playwright creation covered later.

## Out of scope

- Research-progress UI.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
