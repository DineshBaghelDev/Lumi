# 011 — Chat and progress schema

## Goal

Implement one bounded V1 slice: **chat and progress schema**.

## Depends on

- `006-drizzle-foundation.md`
- `007-core-course-schema.md`
- `008-learning-content-schema.md`

## Requirements

- Add `lesson_progress`, `concept_progress`, `project_progress`, `user_notes`, `chat_threads`, `chat_messages`.
- Use locked progress status enums.
- Support lesson block resume index and note/bookmark block targeting.
- Chat messages support citations JSON and later `llm_call_id` FK.

## Acceptance criteria

- [ ] Migration applies.
- [ ] One user/course can persist lesson, concept, project, notes/bookmarks, and chat state.
- [ ] Uniqueness prevents duplicate per-user progress rows for the same entity.

## Required tests

- Progress uniqueness/status constraint tests; chat relation smoke test.

## Out of scope

- Progress mutation logic.
- Chat retrieval/API.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
