# Specs Index

> `088-local-infrastructure-migration.md` supersedes the InsForge-specific
> portions of specs 002-006 and 013-014. Use its ticket sequence for the active
> infrastructure migration.

Use these specs as implementation detail, not as 87 serial stops.

## Execution model

Implement by milestone from `docs/IMPLEMENTATION-PLAN.md`. Each milestone may
pull in several numbered specs in one coherent change, as long as the milestone
gate passes and `context/progress-tracker.md` records what landed.

The numbered specs remain the source for detailed requirements, edge cases, and
tests. Their per-file "do not start unrelated specs" completion note is
superseded by this milestone execution model.

## Milestone map

### 1. Foundation

Detailed specs:

- `001-monorepo-skeleton.md` — Monorepo skeleton
- `002-env-config.md` — Environment and config contract
- `003-docker-services.md` — Local Docker service stack
- `004-insforge-client.md` — InsForge client integration
- `005-google-auth.md` — Google OAuth V1
- `006-drizzle-foundation.md` — Drizzle and migrations foundation
- `007-core-course-schema.md` — Core course and concept schema
- `008-learning-content-schema.md` — Curriculum, lesson, assessment, project schema
- `009-generation-jobs-schema.md` — Generation job queue schema
- `010-generation-job-state-machine.md` — Generation job state machine and idempotency
- `011-chat-progress-schema.md` — Chat and progress schema
- `012-llm-calls-tracking.md` — LLM call tracking schema and helper
- `013-fastify-foundation.md` — Fastify API foundation
- `014-auth-middleware.md` — API JWT authentication and authorization foundation
- `015-post-courses-stub.md` — POST /courses stub
- `016-enrollment-creation-flow.md` — Course owner enrollment creation
- `017-course-read-apis.md` — Course read APIs
- `018-course-status-state-machine.md` — Course status state machine
- `019-generation-budget-invariants.md` — Course generation budgets and cancellation
- `020-worker-polling.md` — Worker polling and claim loop
- `021-worker-leases-heartbeats.md` — Worker leases, heartbeat, stale reclamation
- `022-worker-retries.md` — Worker retry policy
- `023-worker-concurrency.md` — Worker concurrency controls

Gate: `POST /courses -> enrollment + research job -> worker claim`.

### 2. Research

Detailed specs:

- `024-litellm-client.md` — LiteLLM client and provider abstraction
- `025-searxng-client.md` — SearXNG client
- `026-crawl4ai-client.md` — Crawl4AI client
- `027-tei-embedding-client.md` — TEI embedding client
- `028-expected-concept-map.md` — Expected concept map generation
- `029-prerequisite-expansion.md` — Prerequisite expansion
- `030-search-query-generation.md` — Research search query generation
- `031-source-filtering.md` — Cheap source filtering and initial ranking
- `032-official-source-protection.md` — Official and primary source protection
- `033-research-security-boundaries.md` — Research security boundaries
- `034-source-crawling.md` — Selected source crawling and storage
- `035-source-chunking.md` — Source cleaning, semantic chunking, tagging
- `036-source-embeddings.md` — Source chunk embeddings
- `037-concept-source-mapping.md` — Source-derived concept mapping and source packs
- `038-coverage-gap-detection.md` — Concept coverage and edge-case detection
- `039-targeted-gap-search.md` — Targeted research gap loop
- `040-research-assets.md` — Research image asset ingestion
- `041-research-job-integration.md` — Research job end-to-end handler

Gate: `course -> research -> persisted sources/concepts/assets -> curriculum job`.

### 3. Course Generation

Detailed specs:

- `042-curriculum-schema.md` — Curriculum structured-output contract
- `043-curriculum-generator.md` — Curriculum generation
- `044-curriculum-validator.md` — Curriculum completeness/order validator
- `045-module-lesson-skeletons.md` — Persist module and lesson skeletons
- `046-assessment-skeletons.md` — Create assessment skeletons
- `047-project-skeletons.md` — Create project and milestone skeletons
- `048-curriculum-job-integration.md` — Curriculum job integration
- `067-course-creation-ui.md` — Course creation screen
- `068-realtime-polling-progress.md` — Realtime generation updates with polling fallback
- `069-generation-progress-ui.md` — Generation progress and partial availability UI
- `070-roadmap-ui.md` — Course roadmap UI

Gate: `research outputs -> curriculum skeleton -> lesson/project jobs`.

### 4. Lessons

Detailed specs:

- `049-lesson-content-zod-schema.md` — Versioned lesson content contract
- `050-lesson-source-retrieval.md` — Lesson source-pack retrieval
- `051-lesson-generator.md` — Structured lesson generator
- `052-mermaid-block-rendering.md` — Mermaid lesson block renderer
- `053-image-asset-handling.md` — Lesson image asset generation/reuse
- `054-lesson-quality-checks.md` — Lesson quality-control gates
- `055-lesson-regeneration.md` — Full lesson regeneration on QC failure
- `056-lesson-job-integration.md` — Lesson job end-to-end handler
- `071-lesson-renderer.md` — Structured lesson renderer

Gate: `lesson skeleton -> ready lesson -> exactly one question job`.

### 5. Projects

Detailed specs:

- `057-project-generation.md` — Guided project content generation
- `058-project-milestones.md` — Generate full milestone scenarios and outcomes
- `059-project-hints-guidance.md` — Progressive project hints and help content
- `060-project-job-integration.md` — Project job integration
- `073-project-ui.md` — Guided project UI

Gate: `project skeleton -> ready project -> populated milestones`.

### 6. Assessments

Detailed specs:

- `061-question-schema.md` — Question and scoring contracts
- `062-question-generator.md` — Generate post-lesson question candidates
- `063-question-validation.md` — Question correctness, ambiguity, duplicate validation
- `064-objective-question-scoring.md` — Deterministic objective scoring
- `065-free-response-scoring.md` — Rubric-based free-response scoring
- `066-question-job-integration.md` — Per-lesson question job and assessment population
- `072-assessment-ui.md` — Assessment serving and UI

Gate: `ready lesson -> question job -> populated assessment -> scoring`.

### 7. Learning Experience

Detailed specs:

- `074-progress-state.md` — Progress mutation and resume behavior
- `075-notes-bookmarks.md` — Lesson notes and bookmarks
- `076-rag-retrieval.md` — Course-scoped RAG retrieval
- `077-rag-chat-api.md` — RAG chat API and persistence
- `078-rag-chat-streaming.md` — Fastify chat streaming
- `079-rag-chat-ui.md` — Course and lesson chat UI
- `080-chat-citations.md` — Citation display and source resolution

Gate: `course data -> resume state + cited course-aware answer`.

### 8. Hardening

Detailed specs:

- `081-api-integration-tests.md` — API integration test suite
- `082-worker-pipeline-tests.md` — Worker pipeline and job orchestration tests
- `083-asset-tests.md` — Research and lesson asset tests
- `084-rag-chat-tests.md` — RAG retrieval/chat integration tests
- `085-playwright-happy-path.md` — Playwright V1 happy path
- `086-failure-retry-ux.md` — Failure, retry, and cancellation UX
- `087-final-v1-polish.md` — Final V1 polish and release checklist

Gate: full Playwright happy path plus deliberate failure/retry/cancellation fixture.
