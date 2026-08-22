# Progress Tracker

## Status

Planning: complete  
Implementation: in progress
Current milestone: 1 — Foundation  
Current spec: `002-env-config.md`

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

## In progress

- [ ] `002-env-config.md`

## Notes / deviations

The original 84-spec plan was patched before implementation with three bounded specs: job state/idempotency, generation budgets/cancellation, and research security. Total: 87 specs.

Phase 2 setup is complete. See `context/setup-handoff.md` before starting Phase 3.

001 handoff: The root pnpm/Turborepo skeleton and seven placeholder workspaces exist. App dev discovery is filtered to the three apps. The graph check rejects dependencies on any app package. Service directories are README-only configuration placeholders. No framework or product integrations were pulled forward.
