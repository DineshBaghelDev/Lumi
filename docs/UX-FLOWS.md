# UX Flows

## Design intent

Light-mode, spacious, sequential, modern learning experience. Avoid dense dashboards. Separate major tasks into screens so the user sees the next meaningful action rather than the entire system state.

## 1. Create course

Route: `/courses/new`

Show:
- topic input
- goal/depth preference
- one primary Create action
- concise expectation of what happens next

After submit, navigate to course generation view.

If the user exceeds configured generation/rate limits, return a clear bounded-work message rather than silently queueing excessive work.

## 2. Generation / roadmap emergence

Route: `/courses/:id`

Before curriculum:
- show meaningful background research progress
- show lightweight educational/product content while waiting
- allow generation cancellation

After curriculum:
- reveal full module/lesson roadmap
- lessons show `pending | generating | ready | failed`
- ready lessons become clickable immediately
- generation continues in background
- assessment availability appears independently as each ready lesson's question job completes

Realtime updates use InsForge Realtime with 5-second polling fallback.

## 3. Roadmap

Show modules in order, lesson status, assessment readiness, optional project checkpoints, and weak/review indicators. Keep secondary metadata compact.

## 4. Lesson

Route: `/courses/:id/lesson/:lessonId`

Primary column renders structured lesson blocks. Secondary/supporting UI may contain source references, notes/bookmarks, and lesson chat access. Keep reading width comfortable.

Supported block types include headings, paragraphs, lists, code, callouts, Mermaid diagrams, and stored/approved images.

If the lesson is ready but its assessment is still generating, allow learning immediately and show a quiet "assessment preparing" state.

## 5. Assessment

Route: `/courses/:id/assessment/:assessmentId`

One question at a time.

MCQ gives immediate correctness feedback. Other types collect answers and score at final submission. Completion view shows exact weak concepts and guidance.

Assessment is available as soon as its own per-lesson question job succeeds; no dependency on later lessons.

## 6. Guided project

Route: `/courses/:id/project/:projectId`

Show only the active scenario/milestone:
- current problem/context
- learner decision prompt where appropriate
- what to implement locally
- relevant lessons/resources
- hint action with progressive hints
- “I'm done” action

No editor, terminal, upload, or automatic code review in V1.

## 7. Chat

Route: `/courses/:id/chat` plus optional floating panel in lesson view.

Stream responses. Show citations that can resolve back to source records/chunks. Lesson-opened chat prioritizes lesson context while retaining course-wide retrieval.

## 8. Resume

Home/My Courses shows continuation point. Opening a course resolves last active lesson/block and any unfinished assessment/project without forcing the user through a dashboard.

## Generation stop/failure states

- research/curriculum fatal failure: course failed with retry path for the failed job
- lesson/project failure: failed item shown in roadmap with retry; other ready content remains usable
- question failure: only that lesson's assessment is unavailable until retry; lesson remains usable
- explicit cancellation/budget exhaustion: course shows generation stopped/cancelled, reason when appropriate, and preserves all completed content
- security-rejected source: do not expose technical exploit details to normal users; research continues with alternate sources when possible
