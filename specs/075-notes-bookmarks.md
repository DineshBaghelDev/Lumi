# 075 — Lesson notes and bookmarks

## Goal

Implement one bounded V1 slice: **lesson notes and bookmarks**.

## Depends on

- `011-chat-progress-schema.md`
- `071-lesson-renderer.md`

## Requirements

- Implement create/update/delete note and bookmark APIs scoped to authenticated user/course/lesson/block.
- Add minimal lesson UI controls for block bookmark and note creation.
- Ensure cross-user isolation.

## Acceptance criteria

- [ ] User can bookmark a block and attach/edit a note.
- [ ] Notes/bookmarks persist and rehydrate on lesson reopen.
- [ ] Unauthorized user cannot access another user’s notes.

## Required tests

- API integration tests; focused component tests.

## Out of scope

- Rich collaborative annotations.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
