# Progress Tracker

## Status

Planning: complete  
Implementation: in progress
Current milestone: 2 — Research
Current spec: `024-litellm-client.md`

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
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:generate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:migrate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db build`.
  - Handoff: `@lumi/db` owns Drizzle config, public schema/client exports, the initial migration, pgvector enablement, HNSW cosine index on 384-dim source chunk embeddings, core course/concept/source schema, curriculum/lesson/assessment/project schema, and explicit generation job target columns/indexes. Job lifecycle/idempotency behavior remains for spec 010.
- `010-generation-job-state-machine.md` — complete
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:generate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:migrate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db build`.
  - Handoff: `@lumi/db` now exports conflict-safe generation-job enqueue helpers and the shared lifecycle service for claim, success, retryable/permanent failure, cancellation, and manual retry. Migration `0001_naive_madrox.sql` adds DB-backed logical uniqueness and target/type checks for all five V1 job types.
- `011-chat-progress-schema.md` and `012-llm-calls-tracking.md` — complete
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:generate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:migrate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/llm typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/llm test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/llm build`; `pnpm --config.verify-deps-before-run=false workspace:check`.
  - Handoff: progress, notes/bookmarks, chat, and `llm_calls` schema live in `@lumi/db`. `@lumi/llm` now exports `recordLlmCall`, a small SQL-hiding logging helper that fails loudly if observability persistence fails.

- `013-fastify-foundation.md` through `023-worker-concurrency.md` — complete
  - Verification: `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:generate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db db:migrate`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/db build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/api build`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker typecheck`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker test`; `pnpm --config.verify-deps-before-run=false --filter @lumi/worker build`.
  - Gate: DB-backed `milestone 1 gate` passes: `POST /courses` creates durable course, usage snapshot, owner enrollment, and queued research job; worker claim SQL locks that exact research job.
  - Handoff: `apps/api` is a Fastify app with health, auth, course create/read/cancel/read-content stubs, safe error envelopes, and graceful close. `apps/worker` can claim queued/stale jobs, heartbeat, classify retryable errors, and enforce global/lesson-per-course claim limits. Research execution remains intentionally unimplemented for Milestone 2.

## In progress

- [ ] `024-litellm-client.md`

## Notes / deviations

The original 84-spec plan was patched before implementation with three bounded specs: job state/idempotency, generation budgets/cancellation, and research security. Total: 87 specs.

Phase 2 setup is complete. See `context/setup-handoff.md` before starting Phase 3.

001 handoff: The root pnpm/Turborepo skeleton and seven placeholder workspaces exist. App dev discovery is filtered to the three apps. The graph check rejects dependencies on any app package. Service directories are README-only configuration placeholders. No framework or product integrations were pulled forward.
