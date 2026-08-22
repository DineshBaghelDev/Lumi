# UI Registry

| Surface | Route | Purpose | V1 status |
|---|---|---|---|
| Home / My Courses | `/` or `/courses` | Resume and browse owned courses | Planned |
| Create Course | `/courses/new` | Topic + goal input and create action | Planned |
| Generation | `/courses/:id` while generating | Research/curriculum/lesson progress and partial availability | Planned |
| Roadmap | `/courses/:id` | Modules, lesson status, project checkpoints | Planned |
| Lesson | `/courses/:id/lesson/:lessonId` | Structured lesson renderer and lesson actions | Planned |
| Assessment | `/courses/:id/assessment/:assessmentId` | One-question-at-a-time test | Planned |
| Project | `/courses/:id/project/:projectId` | Progressive scenario, milestone, hints, “done” flow | Planned |
| Course Chat | `/courses/:id/chat` | Course-scoped RAG Q&A | Planned |
| Lesson Chat Panel | lesson route panel | Same RAG chat with lesson context priority | Planned |

## Reusable component families

- Course cards/status badges
- Generation progress timeline
- Module/lesson roadmap rows
- Lesson content blocks: heading, paragraph, list, code, callout, Mermaid, image
- Assessment renderers: MCQ, fill blank, match-up, short answer, scenario, identify issue, predict behavior, pseudocode
- Project milestone/scenario card
- Hint stack
- Chat message + citation chips
- Notes/bookmarks controls

Add implementation paths as components are built. Do not create duplicate primitives when an existing registry component fits.
