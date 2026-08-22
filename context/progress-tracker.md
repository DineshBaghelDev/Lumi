# Progress Tracker

## Status

Planning: complete  
Implementation: in progress
Current milestone: 1 — Foundation  
Current spec: `004-insforge-client.md`

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

## In progress

- [ ] `004-insforge-client.md`

## Notes / deviations

The original 84-spec plan was patched before implementation with three bounded specs: job state/idempotency, generation budgets/cancellation, and research security. Total: 87 specs.

Phase 2 setup is complete. See `context/setup-handoff.md` before starting Phase 3.

001 handoff: The root pnpm/Turborepo skeleton and seven placeholder workspaces exist. App dev discovery is filtered to the three apps. The graph check rejects dependencies on any app package. Service directories are README-only configuration placeholders. No framework or product integrations were pulled forward.
