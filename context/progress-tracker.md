# Progress Tracker

## Status

Planning: complete  
Implementation: not started  
Current milestone: 1 — Foundation  
Current spec: `001-monorepo-skeleton.md`

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
- BGE-small-en-v1.5, 384-dim embeddings using LM studio
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

## Completed specs

None.

## In progress

- [ ] `001-monorepo-skeleton.md`

## Notes / deviations

The original 84-spec plan was patched before implementation with three bounded specs: job state/idempotency, generation budgets/cancellation, and research security. Total: 87 specs.
