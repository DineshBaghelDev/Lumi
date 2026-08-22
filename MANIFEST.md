# Documentation Pack Manifest

## Top-level

- `README.md`
- `AGENTS.md`

## Context

- `context/architecture.md`
- `context/build-plan.md`
- `context/code-standards.md`
- `context/design-system.md`
- `context/library-docs.md`
- `context/progress-tracker.md`
- `context/project-overview.md`
- `context/ui-registry.md`

## Deep docs

- `docs/CONTENT-CONTRACTS.md`
- `docs/DATA-MODEL.md`
- `docs/DECISIONS.md`
- `docs/IMPLEMENTATION-PLAN.md`
- `docs/LEARNING-SYSTEM.md`
- `docs/PRODUCT.md`
- `docs/RESEARCH-PIPELINE.md`
- `docs/SYSTEM-ARCHITECTURE.md`
- `docs/UX-FLOWS.md`

## Implementation specs (87)

- `specs/001-monorepo-skeleton.md` — Monorepo skeleton
- `specs/002-env-config.md` — Environment and config contract
- `specs/003-docker-services.md` — Local Docker service stack
- `specs/004-insforge-client.md` — InsForge client integration
- `specs/005-google-auth.md` — Google OAuth V1
- `specs/006-drizzle-foundation.md` — Drizzle and migrations foundation
- `specs/007-core-course-schema.md` — Core course and concept schema
- `specs/008-learning-content-schema.md` — Curriculum, lesson, assessment, project schema
- `specs/009-generation-jobs-schema.md` — Generation job queue schema
- `specs/010-generation-job-state-machine.md` — Generation job state machine and idempotency
- `specs/011-chat-progress-schema.md` — Chat and progress schema
- `specs/012-llm-calls-tracking.md` — LLM call tracking schema and helper
- `specs/013-fastify-foundation.md` — Fastify API foundation
- `specs/014-auth-middleware.md` — API JWT authentication and authorization foundation
- `specs/015-post-courses-stub.md` — POST /courses stub
- `specs/016-enrollment-creation-flow.md` — Course owner enrollment creation
- `specs/017-course-read-apis.md` — Course read APIs
- `specs/018-course-status-state-machine.md` — Course status state machine
- `specs/019-generation-budget-invariants.md` — Course generation budgets and cancellation
- `specs/020-worker-polling.md` — Worker polling and claim loop
- `specs/021-worker-leases-heartbeats.md` — Worker leases, heartbeat, stale reclamation
- `specs/022-worker-retries.md` — Worker retry policy
- `specs/023-worker-concurrency.md` — Worker concurrency controls
- `specs/024-litellm-client.md` — LiteLLM client and provider abstraction
- `specs/025-searxng-client.md` — SearXNG client
- `specs/026-crawl4ai-client.md` — Crawl4AI client
- `specs/027-tei-embedding-client.md` — TEI embedding client
- `specs/028-expected-concept-map.md` — Expected concept map generation
- `specs/029-prerequisite-expansion.md` — Prerequisite expansion
- `specs/030-search-query-generation.md` — Research search query generation
- `specs/031-source-filtering.md` — Cheap source filtering and initial ranking
- `specs/032-official-source-protection.md` — Official and primary source protection
- `specs/033-research-security-boundaries.md` — Research security boundaries
- `specs/034-source-crawling.md` — Selected source crawling and storage
- `specs/035-source-chunking.md` — Source cleaning, semantic chunking, tagging
- `specs/036-source-embeddings.md` — Source chunk embeddings
- `specs/037-concept-source-mapping.md` — Source-derived concept mapping and source packs
- `specs/038-coverage-gap-detection.md` — Concept coverage and edge-case detection
- `specs/039-targeted-gap-search.md` — Targeted research gap loop
- `specs/040-research-assets.md` — Research image asset ingestion
- `specs/041-research-job-integration.md` — Research job end-to-end handler
- `specs/042-curriculum-schema.md` — Curriculum structured-output contract
- `specs/043-curriculum-generator.md` — Curriculum generation
- `specs/044-curriculum-validator.md` — Curriculum completeness/order validator
- `specs/045-module-lesson-skeletons.md` — Persist module and lesson skeletons
- `specs/046-assessment-skeletons.md` — Create assessment skeletons
- `specs/047-project-skeletons.md` — Create project and milestone skeletons
- `specs/048-curriculum-job-integration.md` — Curriculum job integration
- `specs/049-lesson-content-zod-schema.md` — Versioned lesson content contract
- `specs/050-lesson-source-retrieval.md` — Lesson source-pack retrieval
- `specs/051-lesson-generator.md` — Structured lesson generator
- `specs/052-mermaid-block-rendering.md` — Mermaid lesson block renderer
- `specs/053-image-asset-handling.md` — Lesson image asset generation/reuse
- `specs/054-lesson-quality-checks.md` — Lesson quality-control gates
- `specs/055-lesson-regeneration.md` — Full lesson regeneration on QC failure
- `specs/056-lesson-job-integration.md` — Lesson job end-to-end handler
- `specs/057-project-generation.md` — Guided project content generation
- `specs/058-project-milestones.md` — Generate full milestone scenarios and outcomes
- `specs/059-project-hints-guidance.md` — Progressive project hints and help content
- `specs/060-project-job-integration.md` — Project job integration
- `specs/061-question-schema.md` — Question and scoring contracts
- `specs/062-question-generator.md` — Generate post-lesson question candidates
- `specs/063-question-validation.md` — Question correctness, ambiguity, duplicate validation
- `specs/064-objective-question-scoring.md` — Deterministic objective scoring
- `specs/065-free-response-scoring.md` — Rubric-based free-response scoring
- `specs/066-question-job-integration.md` — Per-lesson question job and assessment population
- `specs/067-course-creation-ui.md` — Course creation screen
- `specs/068-realtime-polling-progress.md` — Realtime generation updates with polling fallback
- `specs/069-generation-progress-ui.md` — Generation progress and partial availability UI
- `specs/070-roadmap-ui.md` — Course roadmap UI
- `specs/071-lesson-renderer.md` — Structured lesson renderer
- `specs/072-assessment-ui.md` — Assessment serving and UI
- `specs/073-project-ui.md` — Guided project UI
- `specs/074-progress-state.md` — Progress mutation and resume behavior
- `specs/075-notes-bookmarks.md` — Lesson notes and bookmarks
- `specs/076-rag-retrieval.md` — Course-scoped RAG retrieval
- `specs/077-rag-chat-api.md` — RAG chat API and persistence
- `specs/078-rag-chat-streaming.md` — Fastify chat streaming
- `specs/079-rag-chat-ui.md` — Course and lesson chat UI
- `specs/080-chat-citations.md` — Citation display and source resolution
- `specs/081-api-integration-tests.md` — API integration test suite
- `specs/082-worker-pipeline-tests.md` — Worker pipeline and job orchestration tests
- `specs/083-asset-tests.md` — Research and lesson asset tests
- `specs/084-rag-chat-tests.md` — RAG retrieval/chat integration tests
- `specs/085-playwright-happy-path.md` — Playwright V1 happy path
- `specs/086-failure-retry-ux.md` — Failure, retry, and cancellation UX
- `specs/087-final-v1-polish.md` — Final V1 polish and release checklist
