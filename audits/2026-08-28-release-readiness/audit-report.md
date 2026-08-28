# Lumi project audit — 2026-08-28

## Release verdict

**NO-GO.** Lumi has a substantial working foundation, but it does not currently deliver the complete V1 experience it claims. The largest gaps are functional and operational: course completion state is broken, general-topic research is shallow, generation budgets are unenforced, chat and citations are unreliable, learner progress is misleading, and the published E2E gate does not exercise the real journey.

## Executive scorecard

| Domain | Status | Assessment |
|---|---|---|
| Authentication and data isolation | Partial | APIs generally require authentication, but protected pages render to anonymous users. |
| Course generation | Fail | Content may generate, but aggregate course status can remain stuck indefinitely. |
| Source-backed research | Fail | Non-Redis topics receive three generic concepts, generally attached to one source. |
| Lessons, projects, assessments | Partial | Core structures exist, but rendering, state, retry, and progress behavior have major gaps. |
| Learner progress and resume | Fail | Generated-content state is confused with learner completion; resume is incomplete. |
| RAG chat and citations | Fail | Thread continuity, ownership validation, and citation hydration are broken. |
| Cost and resource controls | Fail | Configured LLM, course, and rate limits are not enforced. |
| UI and UX | Partial | Routes render, but authentication, errors, state labels, and mutation feedback are misleading. |
| Accessibility | Partial | Some foundations exist; forms, feedback, and disabled controls have gaps. |
| Security | Fail | Proxy SSRF/token disclosure plus authorization, resource-consumption, and ingestion risks. |
| Automated verification | Fail | `pnpm test` fails; Playwright happy-path coverage is primarily route stubs. |
| Deployment readiness | Unproven | No current full-stack, production-topology, or browser-E2E proof. |

## Release blockers

### 1. Course generation does not reliably reach a terminal state

`deriveCourseStatus` exists in `packages/db/src/courses.ts`, but the worker does not call it after jobs settle. The worker marks individual jobs successful or failed without recalculating the course.

Consequences:

- Successful or partially successful courses can remain `generating`.
- Course pages can poll forever.
- Nonfatal failures do not resolve to `ready_with_gaps`.
- Users see 0% generation even when usable content exists.

Read-only database evidence found one course stuck in `generating` with zero queued/running jobs, two successful jobs, four failed jobs, a curriculum, three lessons, and a project. Under the approved state model it should be `ready_with_gaps`.

### 2. The deep, source-grounded course claim is not met

The product promises enough depth for learners to reason from first principles and understand implementation trade-offs. General-topic research instead creates three generic concepts:

- `<topic> fundamentals`
- implementation
- failure modes

Redis has a special fixture; other subjects do not receive genuine topic-specific concept discovery. Concepts are marked covered with fixed confidence and commonly connected to the same first source.

The live database confirmed that all three existing courses had exactly three concepts, each mapped to only one distinct source. This is scaffolding-quality research rather than concept-complete research.

### 3. Cost and resource limits are configured but not enforced

Maximum LLM calls, cost, active courses, and creation-rate settings are parsed from configuration but are not enforced at course creation or before paid model calls.

Current database evidence:

- All `course_generation_usage.llm_calls_count` values remained zero.
- One course had 24 recorded model calls and roughly 70,619 tokens.
- Chat and repeated free-response grading lacked account-level rate or cost controls.

This creates denial-of-wallet and capacity risks.

### 4. Catch-all web proxy permits SSRF and bearer-token disclosure

`apps/web/src/app/api/proxy/[...path]/route.ts` constructs its upstream URL from attacker-controlled path text and forwards the current bearer token.

Runtime validation confirmed:

```text
https:/example.com/x => https://example.com/x
//example.com/x      => http://example.com/x
```

An attacker can cause server-side requests to external hosts, potentially carrying an authenticated user's bearer token. The proxy also lacks response-size and timeout controls.

### 5. The claimed release gate is not a real end-to-end test

Spec 085 requires authenticated course creation, generation, lesson reading, assessment, project, chat, notes/bookmarks, reload/resume, and failure/retry coverage.

The Playwright file mainly navigates to `/courses`; several tests have no meaningful assertions. The progress tracker acknowledges that these are lightweight stubs while simultaneously marking V1 complete. Passing these tests cannot establish release readiness.

## Functional and user-flow findings

1. `/dashboard`, `/courses`, and `/courses/new` render to unauthenticated users. Visitors see authenticated-looking screens or generic API failures instead of a sign-in redirect.
2. A sign-out action exists but is not exposed by the current UI.
3. When chat begins without a thread ID, the server creates one but the client does not retain it; subsequent messages can become separate conversations.
4. `POST /courses/:id/chat` accepts a supplied thread ID without validating that it belongs to the requesting user and course.
5. Fresh citation resolution is called with an empty chunk-ID list, which violates the API schema. Loaded messages return IDs while the client expects resolved citation objects.
6. When retrieval fails, chat is instructed to answer from general knowledge, contradicting the source-grounded product claim.
7. Research records a prompt-injection flag but does not quarantine the content. Raw crawled chunks are inserted into the chat system prompt.
8. Generated-content readiness is confused with learner completion: ready lessons appear Done and ready courses appear 100% complete without consulting learner progress.
9. Per-lesson progress is not loaded when reopening ordinary lessons. Reading position is effectively zero or fully complete, so resume-to-block cannot work.
10. Course resume considers lesson progress but can report course completion while required assessments or projects remain unfinished.
11. A bookmark callback exists but no bookmark control calls it. Notes can be created and deleted but not edited through the UI.
12. Several progress, note, and bookmark mutations optimistically update the UI without checking `response.ok`, so authorization or service failures can look successful.
13. An MCQ network failure can be represented as an incorrect answer and lock the choice.
14. Assessment submission is not idempotent; retries and double-submits can create duplicate attempts and repeat paid grading.
15. Previous assessment attempts are fetched but not clearly displayed or resumed.
16. Research writes deterministic asset storage paths but does not upload the corresponding objects to InsForge Storage. Lesson images can therefore be broken.
17. The approved `react-markdown` and Shiki lesson-rendering stack is absent; Markdown and syntax highlighting are incomplete.
18. Documentation claims InsForge Realtime and TanStack Query reconciliation, while the implementation performs periodic server-component refreshes.
19. A worker process claims and awaits one job at a time despite a higher configured concurrency, creating poor generation throughput unless multiple processes are deployed.
20. Generation cancellation has no confirmation, and creation/project errors are frequently generic, silent, or redirected to UI that does not display them.

## User-flow health

| Step | Health | User impact |
|---|---|---|
| Landing and sign-in | Partial | Pages render, but the OAuth exchange was not live-tested. |
| Enter protected application | Fail | Anonymous users see authenticated-looking screens. |
| Create course | Partial | Form exists; errors and limits are unclear or unenforced. |
| Research and generate | Fail | Shallow research and stuck status prevent reliable completion. |
| View roadmap | Partial | Content may exist, but state and progress labels are misleading. |
| Read lessons | Partial | Basic content renders; Markdown, code, images, and citations are incomplete. |
| Take assessment | Partial | Scoring exists, but retry, network-failure, and history handling are unsafe. |
| Complete project | Partial | Project structures exist; progress and failure feedback are incomplete. |
| Ask course-aware questions | Fail | Thread continuity, ownership, and citations are broken. |
| Take notes and bookmark | Fail | Notes are partial; bookmarking and editing are absent. |
| Leave and resume | Fail | Reading position and non-lesson completion are not faithfully restored. |

## Security findings

The security scan produced five reportable findings:

- High: catch-all proxy SSRF and potential bearer-token disclosure.
- High: configured cost and resource limits are not enforced.
- High, medium confidence: crawler validation can be bypassed through redirects or DNS rebinding because validation is not bound to the component opening the connection.
- Medium: chat thread ownership bypass.
- Medium: detected prompt-injection content is still elevated into the model's system prompt.

Additionally, none of the 30 inspected public database tables had row-level security enabled despite documentation describing RLS as a safety net. API authorization is therefore the primary tenant boundary.

See `security/security-report.md` and the three JSON security artifacts for the complete evidence and machine-readable record.

## Testing and verification

- `pnpm test`: **failed**.
  - API: 36/36 passed.
  - Worker: 42/44 passed.
  - Two milestone-gate tests collided with existing live queued generation jobs because they use the shared database and global job claimer.
- Relevant TypeScript checks passed, including the web application.
- Direct HTTP checks returned 200 for `/`, `/sign-in`, `/dashboard`, `/courses`, and `/courses/new`.
- The API was not running and Docker Desktop was unavailable, so a complete live generation journey could not be executed.
- Browser control was unavailable. This is not a current screenshot-level visual audit; UI findings are based on source inspection and direct HTTP behavior.
- No application files or production data were changed during the audit.

## Documentation and project-management findings

- `README.md` reports Milestone 2 as current while `context/progress-tracker.md` says V1 is complete.
- The tracker calls E2E tests lightweight stubs while recording the corresponding release gate as passed.
- Architecture documentation describes realtime, TanStack Query, storage uploads, and provider routing that do not match the effective implementation.
- No demonstrated production deployment topology, TLS/ingress configuration, backup/restore exercise, or current full-stack release rehearsal was found.

## Recommended recovery order

### P0 — before release

1. Eliminate the proxy SSRF and token-leak path.
2. Recalculate course status after every terminal job transition.
3. Enforce course, LLM-call, cost, and grading limits transactionally.
4. Replace generic research fixtures with genuine topic concept discovery and evidence-based coverage.
5. Validate chat thread ownership and repair thread/citation persistence.
6. Build a seeded, authenticated, hermetic E2E journey with real assertions.

### P1 — before external beta

1. Correct learner progress and resume semantics.
2. Add actual storage upload or remove unsupported asset claims.
3. Redirect unauthenticated application routes and expose sign-out.
4. Make assessment submission idempotent and resilient to network failures.
5. Implement bookmarks, note editing, and honest mutation failure feedback.
6. Either implement the documented realtime behavior or correct the documentation.

### P2 — polish and operations

1. Implement approved Markdown/Shiki rendering and visible source links.
2. Complete keyboard, label, live-region, and disabled-control accessibility checks.
3. Reconcile README, tracker, architecture, and effective configuration.
4. Add deployment, observability, backup, and restore evidence.

## Final recommendation

Do not release V1 yet. Fix the six P0 blockers, then require one seeded authenticated generation-to-resume journey as the release gate.

