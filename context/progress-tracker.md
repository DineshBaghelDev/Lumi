# Progress Tracker

## Status

Planning: complete  
Implementation: in progress  
Current focus: Milestone 7 — Progress, notes/bookmarks, chat, and happy-path QA
Next spec: `074-progress-schema.md`

## Current handoff

- Live end-to-end test (2026-08-26): course "PostgreSQL indexing" completed research → curriculum → 3/3 lessons `ready` with valid structured content. LiteLLM now routes `gpt-5.5` to Groq (`openai/gpt-oss-120b`) with OpenRouter as a named fallback deployment; OpenRouter balance cannot cover curriculum-sized requests (402).
- LLM prompts must pin the exact JSON output shape. gpt-oss-120b guesses wrong shapes from prose-only prompts: curriculum returned a string `generationSummary`, lessons omitted `blocks`. Both prompts now embed exact skeletons, plus explicit citation rules because `sourceRefs` defaults to `[]` and omissions only fail later in QC.
- Deterministic gates must be taught to the model: prerequisite QC requires the concept name verbatim or the phrase "previously covered"; the lesson prompt states this.
- Groq free tier caps `openai/gpt-oss-120b` at 8000 tokens/minute per request estimate (prompt + max_tokens). Lesson calls are calibrated to ~7200 worst case: 6 source chunks of 1000 chars + `maxTokens: 5000`. Observed successful lessons use ≤3014 completion tokens including reasoning; reasoning counts against max_tokens and truncated JSON when the budget was 3500.
- TEI returns HTTP 413 for requests containing any input beyond its token limit regardless of batch size (single 4000-char input fails while 32x1000-char inputs pass). Embedding batches are now char-bounded, split recursively on 413, and truncate a single oversized input to 512 chars instead of failing research permanently.
- API error envelope now preserves framework 4xx status codes (Fastify media-type errors were masked as 500), and the worker logs job success/retry/permanent failure to console.
- Test artifacts remain in InsForge for inspection: user `lumi-tester+1787741930737@example.com` (email_verified set via CLI because signup enforces email verification) and course `b58cc760-df7b-457e-a18b-afef3f57af48`. Delete before release data hygiene if desired.

## Previous handoff

- Course generation can now recover from transient research failures such as `fetch failed`.
- LiteLLM has a real `gpt-5.5` route backed by `OPENROUTER_API_KEY`; secrets stay in env.
- Course UI now uses live data only: no preview-course fallback, no dead Projects/Progress nav in the course shell, and no hard page reload for generation polling.
- Course detail now shows progress, failed/cancelled/budget states, cancel action, and same-job retry for failed generation jobs.
- Browser screenshot QA was blocked by the local Browser runtime error `failed to write kernel assets: The system cannot find the path specified`; targeted tests/typechecks passed.

## Locked decisions

- Next.js + Tailwind + shadcn/ui
- Fastify API
- TypeScript/Node everywhere in application code
- Turborepo monorepo
- InsForge Cloud for Postgres/Auth/Storage/Realtime
- Google OAuth only in V1
- Drizzle
- LiteLLM
- SearXNG + Crawl4AI + TEI as local Docker services
- Hugging Face TEI serving BAAI/bge-small-en-v1.5, 384-dim embeddings; LM Studio embedding references are stale
- codex-as-api is the primary development LLM provider through LiteLLM; OpenRouter is fallback
- pgvector HNSW cosine
- Postgres-backed job queue; no Redis
- Five job types: research, curriculum, lesson, project, question
- Job statuses: queued, running, succeeded, failed, cancelled
- Database-backed logical job uniqueness/idempotency
- Hard course-generation budgets + cancellation
- Untrusted research security boundary before crawling/resources reach LLM/UI
- All lessons generated in background after curriculum
- Each ready lesson immediately enqueues its own question job
- Guided projects use the learner's local development environment
- No pre-course diagnostic in V1
- Milestone integration gates are mandatory throughout implementation
- Detailed milestone gate definitions live in `docs/IMPLEMENTATION-PLAN.md`; `AGENTS.md` defines that gates are required

## Completed specs

- `001-monorepo-skeleton.md` — complete; commit `f3c3aa9`
  - Verification: `pnpm install --frozen-lockfile`; bounded `pnpm dev` discovery; workspace graph smoke test; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`.
  - Independent review passed after finding only the tracker omission; this completion record now resolves it.
- `002-env-config.md` — complete; implementation commits `deb61c4` and `1dcae69` (final relevant fix commit: `1dcae69`)
  - Verification: config tests passed 7/7; config typecheck and build passed; `pnpm workspace:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed; forced root build/test/typecheck/lint runs passed; compiled `dist/index.js` runtime import and actionable-error smoke passed; Turbo dry-run reported `@lumi/config#build` output `dist/**`; `git diff --check` passed.
  - Independent review found two medium issues: Turbo did not declare the config build output for cache restoration, and research pages per crawl could exceed the crawled-source budget. Both were fixed; independent re-review reported no findings.
  - Handoff: `@lumi/config` exports `parseApiEnv`, `parseWorkerEnv`, `parseWebPublicEnv`, `parseSharedServicesEnv`, `V1_CONFIG_DEFAULTS`, and `V1_CONFIG_LIMITS`. The public parser allows only `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, and `NEXT_PUBLIC_API_BASE_URL`. TEI is fixed to `BAAI/bge-small-en-v1.5` with 384 dimensions, and lesson-job concurrency per course is capped at 3. Canonical service env names are `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `LITELLM_MODEL`, `CODEX_API_BASE_URL`, `CODEX_API_MODEL`, `OPENROUTER_API_KEY`, `SEARXNG_BASE_URL`, `CRAWL4AI_BASE_URL`, `TEI_BASE_URL`, `TEI_MODEL_ID`, and `TEI_EMBEDDING_DIMENSION`. Spec 003 owns Docker configuration and must consume these names.
- `003-docker-services.md` — complete; implementation commits `b944ef0` and `93f93b5` (final relevant fix commit: `93f93b5`)
  - Verification: `docker compose config --quiet` passed; all four services reached healthy state and their host endpoints returned HTTP 200; SearXNG returned JSON; TEI returned 384-dimensional embeddings and ignored an incompatible model override; Compose restart reused the same containers; LiteLLM rejected an unauthenticated request with 401 and accepted the same request with the configured bearer credential with 200.
  - Independent review found Crawl4AI host-binding/auth incompatibility, an unprotected LiteLLM credential path, and an overridable TEI model. All were fixed; independent re-review reported no findings.
  - Handoff: local endpoints are LiteLLM `http://127.0.0.1:4000`, SearXNG `http://127.0.0.1:8080`, Crawl4AI `http://127.0.0.1:11235`, and TEI `http://127.0.0.1:8081`. Crawl4AI is pinned to official image `0.7.4` because `0.9.2` requires a new host-binding/auth contract not defined for this stack. LiteLLM provider routing remains deferred to spec 024.
- `004-insforge-client.md` — complete; commit `3efb219`
  - Verification: db 2 tests and web 1 test passed; targeted db/web typechecks and builds passed; the exported SDK connectivity probe succeeded with parsed local API config; `pnpm workspace:check` and `git diff --check` passed.
  - Independent review was clean except for this tracker omission, now resolved.
  - Handoff: centralized trusted-server factories and connectivity check live in `@lumi/db`; the SSR browser factory lives in `apps/web`. Local anon/public InsForge env values were added only to ignored `.env`. Spec 005 owns auth routes, refresh middleware, and OAuth.
- `005-google-auth.md` — complete; implementation commits `46fb479`, `4e62259`, and `d7053d8`
  - Verification: InsForge metadata confirms Google OAuth is enabled and `http://localhost:3000/auth/callback` is allowed; `pnpm --filter @lumi/web test`; `pnpm --filter @lumi/web typecheck`; `pnpm --filter @lumi/web build`; `pnpm workspace:check`; `pnpm lint`; `pnpm test`; `pnpm typecheck`; `pnpm build`; scoped `git diff --check -- . ':(exclude)AGENTS.md'`.
  - Independent review found a wrong callback route and insufficient smoke coverage; callback handling was moved to `/auth/callback` and a session-route smoke was added. The unrelated pre-existing `AGENTS.md` working-tree drift still makes unscoped `git diff --check` fail and was intentionally left untouched.
  - Handoff: web is now a minimal Next app. Google OAuth starts at `/api/auth/start`, returns to `/auth/callback`, refreshes through `/api/auth/refresh`, restores sessions via `proxy.ts`, gates `/courses` at the UI level, and signs out through an InsForge SSR server action. No email/password UI was added. API authorization and application-profile syncing remain for later API/schema specs.
- `006-drizzle-foundation.md` through `009-generation-jobs-schema.md` — complete
  - Handoff: `@lumi/db` owns Drizzle config, public schema/client exports, the initial migration, pgvector enablement, HNSW cosine index on 384-dim source chunk embeddings, core course/concept/source schema, curriculum/lesson/assessment/project schema, and explicit generation job target columns/indexes. Job lifecycle/idempotency behavior remains for spec 010.
- `010-generation-job-state-machine.md` — complete
  
  - Handoff: `@lumi/db` now exports conflict-safe generation-job enqueue helpers and the shared lifecycle service for claim, success, retryable/permanent failure, cancellation, and manual retry. Migration `0001_naive_madrox.sql` adds DB-backed logical uniqueness and target/type checks for all five V1 job types.
- `011-chat-progress-schema.md` and `012-llm-calls-tracking.md` — complete
  
  - Handoff: progress, notes/bookmarks, chat, and `llm_calls` schema live in `@lumi/db`. `@lumi/llm` now exports `recordLlmCall`, a small SQL-hiding logging helper that fails loudly if observability persistence fails.

- `013-fastify-foundation.md` through `023-worker-concurrency.md` — complete
  
  - Gate: DB-backed `milestone 1 gate` passes: `POST /courses` creates durable course, usage snapshot, owner enrollment, and queued research job; worker claim SQL locks that exact research job.
  - Handoff: `apps/api` is a Fastify app with health, auth, course create/read/cancel/read-content stubs, safe error envelopes, and graceful close. `apps/worker` can claim queued/stale jobs, heartbeat, classify retryable errors, and enforce global/lesson-per-course claim limits. Research execution remains intentionally unimplemented for Milestone 2.
- `024-litellm-client.md` through `041-research-job-integration.md` — complete
  - Gate: DB-backed `milestone 2 gate` passes with the Redis-topic fixture: claimed research job persists concepts, source, chunks, source pack mappings, research asset metadata, and exactly one curriculum job. Blocked-source and budget-stop fixtures pass.
  - Handoff: `@lumi/llm` exports a typed LiteLLM chat client for normal, structured, and stream-shaped calls plus existing call tracking. `apps/worker` now owns SearXNG, Crawl4AI, and TEI clients, centralized research URL/SSRF guards, sanitization/chunking, deterministic source ranking/protection, Redis-topic concept planning, idempotent research persistence, and the registered `research` job handler. Storage writes are represented by deterministic storage paths/asset rows; real InsForge object upload remains the next hardening point when asset byte tests are expanded.
- `042-curriculum-schema.md` — complete
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/shared test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/shared typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/shared build`; `pnpm --config.verify-deps-before-run=false workspace:check`.
  - Handoff: `@lumi/shared` now exports the versioned Zod curriculum structured-output contract. It validates source-pack, concept, prerequisite, lesson, project, and project-milestone references; requires explicit ordering/objectives/required flags; and retains deterministic local skeleton IDs. Curriculum prompt/generation and DB persistence remain for specs 043-048.
- `043-curriculum-generator.md` through `048-curriculum-job-integration.md` — complete
  - Gate: DB-backed `milestone 3 gate` passes with a mocked Redis-topic curriculum: completed research concepts produce one curriculum, ordered module/lesson skeletons, one assessment skeleton per lesson, project/milestone skeletons, and unique downstream lesson/project jobs. Re-running the curriculum handler does not duplicate skeletons or jobs.
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/worker test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/web typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/web build`; `pnpm --config.verify-deps-before-run=false workspace:check`.
  - Handoff: `apps/worker` now registers the `curriculum` job handler. It calls LiteLLM for the versioned structured curriculum, logs the LLM call, validates prerequisite ordering/required concept coverage, persists idempotent curriculum/module/lesson/assessment/project skeletons, enqueues exactly one lesson job per lesson and one project job per project, and marks fatal research/curriculum failures as course `failed`. `apps/api` now returns roadmap-ready curriculum details, and `apps/web` can create courses, list live courses, poll active course pages, and render generated roadmaps/lesson skeletons from the API.
- `067-course-creation-ui.md` through `070-roadmap-ui.md` — complete
  - Handoff: the existing light Lumi UI is wired to authenticated API calls using the InsForge access-token cookie. Polling fallback now refreshes server data every 5 seconds while generation is active. The course list no longer falls back to sample data, and unsupported course-shell links are hidden.
- `049-lesson-content-zod-schema.md` through `056-lesson-job-integration.md`, plus `071-lesson-renderer.md` — complete
  - Gate: DB-backed `milestone 4 gate` passes with a Redis-topic lesson fixture: a lesson skeleton retrieves course-owned source chunks, fails deterministic QC once, regenerates, persists validated structured lesson JSON, and enqueues exactly one question job for its assessment. Re-running the lesson handler does not duplicate the question job.
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/shared test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/shared typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/shared build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/web typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/web build`.
  - Handoff: `@lumi/shared` now exports the versioned lesson content contract for heading, paragraph, list, code, callout, Mermaid, and image asset blocks. `apps/worker` registers the lesson handler, retrieves bounded source context/assets, runs structured generation plus deterministic/reviewer QC, retries once on QC failure, persists ready content, and uses the existing idempotent question-job uniqueness. `apps/api` validates stored lesson content and resolves referenced image assets. `apps/web` now renders live lesson content, including a client Mermaid block fallback. Existing job claim ordering now prioritizes lesson jobs after curriculum jobs.
- Course generation repair and `086-failure-retry-ux.md` first slice — complete
  - Verification: `pnpm --filter @lumi/worker test`; `pnpm --filter @lumi/api test`; `pnpm --filter @lumi/web typecheck`; `pnpm --filter @lumi/worker typecheck`; `pnpm --filter @lumi/api typecheck`.
  - Handoff: retryable client errors marked with `retryable: true` now use the existing worker backoff path. `POST /generation-jobs/:id/retry` reuses failed jobs after auth/legal-state checks and returns a safe job DTO. Failed course generation is surfaced in the UI with retry, cancel, progress, success, and error states. LiteLLM local routing now maps `gpt-5.5` to OpenRouter via env-backed config.
- `057-project-generation.md` through `060-project-job-integration.md`, plus `073-project-ui.md` — complete
  - Gate: project skeletons become ready guided projects with storyline, progressive milestone content, local implementation goals, ordered hints, lesson links, and learner progress. Project job retries are idempotent, failed projects remain nonfatal, and the UI reveals only the current milestone plus requested hints.
  - Verification: `pnpm --filter @lumi/shared test`; `pnpm --filter @lumi/shared typecheck`; `pnpm --filter @lumi/worker test`; `pnpm --filter @lumi/worker typecheck`; `pnpm --filter @lumi/api test`; `pnpm --filter @lumi/api typecheck`; `pnpm --filter @lumi/web typecheck`.
  - Handoff: `@lumi/shared` exports the project content contract. `apps/worker` registers the project handler, validates project/milestone/hint quality, records LLM calls, and persists milestone content without duplicate rows. `apps/api` serves project progress and hint/milestone actions behind course access checks. `apps/web` adds the guided project route and roadmap links without an in-app IDE or repo review UI.
- `061-question-schema.md` through `066-question-job-integration.md`, plus `072-assessment-ui.md` — complete
  - Gate: ready lessons enqueue one assessment question job; successful question jobs populate scoped questions atomically and idempotently; assessment serving hides keys/rubrics, MCQ feedback is immediate, final submission persists graded attempts and concept guidance.
  - Verification: `pnpm --filter @lumi/shared test`; `pnpm --filter @lumi/shared typecheck`; `pnpm --filter @lumi/worker test`; `pnpm --filter @lumi/worker typecheck`; `pnpm --filter @lumi/api test`; `pnpm --filter @lumi/api typecheck`; `pnpm --filter @lumi/web typecheck`.
  - Handoff: `@lumi/shared` exports all eight V1 question contracts, deterministic objective scoring, rubric grading schemas, and concept-guidance derivation. `apps/worker` registers the question handler, validates candidate scope/diversity/duplicates, retries once on QC failure, and repopulates assessment rows safely on retry. `apps/api` serves assessment payloads without answer keys, checks enrollment before scoring/submission, grades free responses through LiteLLM, and records attempts. `apps/web` adds the assessment runner for choice, fill-blank, matching, and free-text question types.

## In progress

- [ ] `074-progress-schema.md`

## Notes / deviations

The original 84-spec plan was patched before implementation with three bounded specs: job state/idempotency, generation budgets/cancellation, and research security. Total: 87 specs.

Phase 2 setup is complete. See `context/setup-handoff.md` before starting Phase 3.

001 handoff: The root pnpm/Turborepo skeleton and seven placeholder workspaces exist. App dev discovery is filtered to the three apps. The graph check rejects dependencies on any app package. Service directories are README-only configuration placeholders. No framework or product integrations were pulled forward.
