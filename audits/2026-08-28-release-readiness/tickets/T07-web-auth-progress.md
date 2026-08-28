# T07 — Correct web auth, learner progress, resume, notes, and bookmarks

## Problem
Protected pages render anonymous users; sign-out is hidden; ready content is shown as learner completion; lesson progress is not restored; notes/bookmarks lack usable controls and mutation error feedback.

## Scope
Write only web route/page/component files under `apps/web/src/app` plus `apps/web/src/lib` auth/API helpers and focused web tests. Do not edit the API or proxy ticket files.

## Acceptance
- Anonymous application routes redirect or present the approved sign-in state.
- Sign-out is reachable from the authenticated shell.
- Completion labels derive from learner progress, not generated-content readiness.
- Reopening a lesson loads progress and resumes the correct block; course resume respects required non-lesson work.
- Bookmark and note edit controls work; mutation failures are visible and do not commit false optimistic state.
