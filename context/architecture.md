# Architecture Summary

## Runtime

```text
Next.js web
   ↓ HTTP/streaming
Fastify API ─────────────→ InsForge Cloud
   │                       Postgres + pgvector
   │                       Auth + Storage + Realtime
   ↓ writes jobs
Postgres generation_jobs
   ↑ polls
Node worker
   ├─ LiteLLM
   ├─ SearXNG
   ├─ Crawl4AI
   └─ TEI embeddings
```

## Monorepo

```text
apps/web
apps/api
apps/worker
packages/db
packages/shared
packages/config
packages/llm
services/searxng
services/crawl4ai
services/litellm
services/embeddings
```

`services/*` contains Docker/config only.

## Local development

`docker compose up` starts SearXNG, Crawl4AI, LiteLLM, and TEI.

For development, LiteLLM should route generation primarily to codex-as-api at `http://127.0.0.1:18080` and fall back to OpenRouter. The owning LiteLLM spec implements this; do not bypass `packages/llm`.

`pnpm dev` via Turborepo starts web, API, and worker outside Docker for fast HMR.

## Data

InsForge Postgres is the source of truth. Raw crawled Markdown and approved image/generated assets live in InsForge Storage. Postgres stores metadata and storage paths. Source chunks use `vector(384)` with HNSW cosine indexing.

## Background jobs

Flat `generation_jobs` queue grouped by `course_id`.

Types: `research | curriculum | lesson | project | question`.

Statuses: `queued | running | succeeded | failed | cancelled`.

Worker claims rows with `FOR UPDATE SKIP LOCKED`, heartbeats every 30s, and reclaims locks stale after 5 minutes. Retryable failures: 5s → 15s → 45s.

Database uniqueness enforces one research/curriculum job per course, one lesson job per lesson, one project job per project, and one question job per assessment.

## Generation order

`POST /courses → research → curriculum → lesson + project jobs in parallel`

Each successful lesson immediately enqueues the `question` job for its assessment. Lesson 1 can therefore become fully usable while later lessons are still generating.

Curriculum creates module/lesson/assessment/project skeletons. Lesson jobs may run out of order; max 3 lesson jobs per course concurrently.

## Budgets and cancellation

Course generation has configurable hard limits for LLM calls/cost, research/search/crawl volume, concepts, and lessons. Worker stages check limits and cancellation before expensive operations. Budget exhaustion or explicit cancellation stops future work and preserves completed content.

## Research security

All crawled URLs/resources are untrusted. Apply SSRF/private-network/metadata/redirect guards, byte/MIME/depth limits, prompt-injection isolation, and sanitization. Approved images are copied to InsForge Storage before rendering; arbitrary remote resources are never trusted directly.

## Status behavior

Research/curriculum fatal failure → course `failed`.

While generation jobs remain active → `generating`, even though ready lessons are immediately usable.

After generation settles: all required content/assessments ready → `ready`; nonfatal lesson/project/question gaps → `ready_with_gaps`; explicit/budget stop → `cancelled`.

## Chat

RAG chat embeds the query with BGE-small, performs course-scoped pgvector top-k retrieval, and streams an answer through Fastify. V1 has no intent classifier and no LLM reranker.

For details see `docs/SYSTEM-ARCHITECTURE.md`.
