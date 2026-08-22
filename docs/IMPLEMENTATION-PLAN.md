# Implementation Plan

## Milestone 1 — Foundation

- monorepo skeleton
- environment/config
- Docker service configs
- InsForge connection
- Google OAuth
- Drizzle schema/migrations
- canonical generation-job state machine + DB uniqueness/idempotency
- Fastify foundation
- course generation budgets/cancellation
- worker polling/leases/retries/concurrency
- `POST /courses` stub creating course + enrollment + research job

**Integration gate:** `POST /courses → enrollment + research job → worker claim`.

Exit condition: creating a course through the API produces durable rows and a worker can claim the research job without violating budget/job invariants.

## Milestone 2 — Research

- LiteLLM client and call tracking
- SearXNG client
- Crawl4AI client
- TEI embeddings
- expected concept map + prerequisites
- query generation/filtering/source protection
- research security boundary: SSRF/redirect/prompt-injection/content limits/sanitization
- crawl/chunk/embed/map concepts
- coverage-gap loop within generation budget
- research images/assets
- research handler integration

**Integration gate:** `course → research → persisted sources/concepts/assets → curriculum job` using the Redis-topic fixture, including blocked-source and budget-stop cases.

Exit condition: fixed Redis-topic fixture produces persisted sources/chunks/concepts/assets/source packs with coverage states and exactly one curriculum job.

## Milestone 3 — Course generation

- curriculum contract/generator/validator
- module + lesson skeleton creation
- assessment skeleton creation
- project skeleton creation
- course status state machine
- generation/realtime roadmap UI

**Integration gate:** `research outputs → curriculum skeleton → lesson/project jobs`.

Exit condition: completed research creates a valid visible curriculum and enqueues unique lesson/project jobs.

## Milestone 4 — Lessons

- versioned lesson block schema
- source retrieval
- generation
- Mermaid and image handling
- QC + one full retry
- persistence
- lesson renderer
- enqueue one question job per successful lesson assessment

**Integration gate:** `lesson skeleton → ready lesson → exactly one question job for its assessment`.

Exit condition: at least one Redis-topic lesson renders end to end from generated structured JSON and its assessment generation has started independently of later lessons.

## Milestone 5 — Projects

- project generation job
- milestone content/storyline
- progressive hints
- project UI

**Integration gate:** `project skeleton → ready project → populated milestone scenario/hints/outcomes`.

Exit condition: learner can progress through a generated guided Redis-topic project without an in-app IDE.

## Milestone 6 — Assessments

- question schema/generation/validation
- objective/free-response scoring
- per-lesson question jobs
- assessment UI
- concept guidance flags

**Integration gate:** `ready lesson → question job → populated assessment → submission/scoring → concept guidance update`.

Exit condition: a ready lesson can be assessed while later lessons are still generating.

## Milestone 7 — Learning experience

- progress/skip/resume
- notes/bookmarks
- RAG retrieval/chat/streaming/citations

**Integration gate:** `course data → resume state + cited course-aware answer with persisted chunk IDs/llm_call_id`.

Exit condition: user can resume a course and ask cited course-aware questions.

## Milestone 8 — Hardening

- comprehensive API integration tests
- worker pipeline regression tests
- project/asset/RAG assertions
- security/budget/job-invariant regressions
- Playwright happy path
- failure/retry/cancellation UX
- polish/loading/empty states

**Integration gate:** full Playwright happy path plus deliberate failure/retry/cancellation fixture.

## Golden fixture rule

Maintain one deterministic Redis-topic happy-path fixture throughout development. This is a course/test topic fixture, not a Redis infrastructure dependency. Every milestone gate must run when that milestone is completed. The later comprehensive test specs strengthen regression coverage; they do not replace earlier cross-layer checks.
