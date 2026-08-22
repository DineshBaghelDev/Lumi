# 085 — Playwright V1 happy path

## Goal

Implement one bounded V1 slice: **playwright v1 happy path**.

## Depends on

- `067-course-creation-ui.md`
- `068-realtime-polling-progress.md`
- `069-generation-progress-ui.md`
- `070-roadmap-ui.md`
- `071-lesson-renderer.md`
- `072-assessment-ui.md`
- `073-project-ui.md`
- `074-progress-state.md`
- `075-notes-bookmarks.md`
- `079-rag-chat-ui.md`
- `080-chat-citations.md`

## Requirements

- Create browser flow: Google-auth test strategy/session fixture → create course → observe generation → open ready lesson → complete assessment → use project milestone → ask chat question → bookmark/note → reload/resume.
- Use deterministic backend fixture/mocks where external generation would make E2E flaky.
- Verify retry UI path for one simulated failed item.

## Acceptance criteria

- [ ] Happy path completes in CI/local test environment.
- [ ] Partial lesson availability during generation is visible.
- [ ] Resume after reload returns to expected course state.

## Required tests

- Playwright spec in `apps/web/e2e`.

## Out of scope

- Live Google OAuth/external LLM end-to-end in CI.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
