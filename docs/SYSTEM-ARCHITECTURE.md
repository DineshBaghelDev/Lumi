# System Architecture

## Components

### `apps/web`
Next.js + Tailwind + shadcn/ui. Uses TanStack Query for server state. Reads/writes through Fastify APIs, with InsForge Realtime subscriptions for generation updates and 5-second polling fallback.

### `apps/api`
Fastify boundary for authenticated product APIs, streaming chat, course creation/cancellation, progress, assessment submissions, and job retries. Validates InsForge JWTs on every protected request.

### `apps/worker`
Independent Node.js worker. Browser/API shutdown must not affect generation. Polls `generation_jobs`, acquires leases, executes job handlers, heartbeats, retries, enforces budgets/security, and writes progress.

### InsForge Cloud
- Postgres/pgvector source of truth
- Google OAuth identity integration
- Storage for raw crawls and approved/generated assets
- Realtime for generation progress
- RLS as safety net; API authorization remains primary enforcement

### Local Docker services
- SearXNG
- Crawl4AI
- LiteLLM
- Hugging Face TEI serving BAAI/bge-small-en-v1.5

## Monorepo boundaries

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

`services/*` only stores Docker/config files.

## Job queue

`generation_jobs` is the durable queue/status ledger.

Canonical types:

`research | curriculum | lesson | project | question`

Canonical statuses:

`queued | running | succeeded | failed | cancelled`

Claim pattern:

```sql
SELECT ...
FROM generation_jobs
WHERE status = 'queued'
  AND available_at <= now()
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT ...;
```

Worker sets `locked_by`, `locked_at`, transitions to `running`, and heartbeats every 30 seconds. A lock older than 5 minutes may be reclaimed.

Retryable failures transition the same row `running → queued` with 5s, 15s, 45s backoff. Permanent/exhausted failures transition `running → failed`. Explicit retry transitions the existing failed row back to queued through the shared lifecycle service.

### Database idempotency invariants

- one research job per course
- one curriculum job per course
- one lesson job per lesson
- one project job per project
- one question job per assessment

These are enforced with DB constraints/partial unique indexes, not handler convention alone.

## Job graph

1. `POST /courses` creates course + owner enrollment + research job.
2. `research` performs concept planning, secure/bounded search+crawl, chunking, embeddings, coverage QC, source packs/assets, then enqueues curriculum.
3. `curriculum` creates curriculum/modules/lesson/assessment/project skeletons.
4. Curriculum success enqueues all lesson and project jobs.
5. Lesson jobs run independently/out of order; max 3 concurrent lesson jobs per course.
6. Each successful lesson enqueues exactly one `question` job for its assessment immediately.
7. Question jobs populate assessments independently while later lessons may still be generating.

This preserves partial availability: Lesson 1 can be taught and assessed while Lesson 10 is still generating.

## Course state

Course status is aggregate product state, not a queue primitive.

States:

`generating | ready | ready_with_gaps | failed | cancelled | archived`

- `failed`: research/curriculum terminal failure prevents a valid course skeleton.
- `generating`: at least one non-cancelled generation job remains queued/running; ready content may already be usable.
- `ready`: generation settled and required lessons/assessments plus generated project content succeeded.
- `ready_with_gaps`: generation settled with nonfatal lesson/project/question failures/cancellations.
- `cancelled`: user cancellation or hard budget stop; completed content remains readable.

Only the centralized course-status service writes these transitions.

## Generation budgets and cancellation

Every course snapshots configurable hard generation limits. At minimum enforce:

- LLM calls and recorded/estimated cost
- research iterations/search queries
- crawled source count and bytes
- concept count
- lesson count
- per-user concurrent generation/rate limits

Atomic usage counters prevent concurrent lesson jobs from losing updates. Every expensive boundary checks remaining budget/cancellation before execution. Budget exhaustion cancels remaining work, records the violated invariant, and preserves completed content.

`POST /courses/:id/cancel-generation` requests cooperative cancellation. Queued jobs become cancelled; running handlers stop at safe stage/call boundaries.

## Research security boundary

Arbitrary internet content is hostile input.

Before Crawl4AI/resource fetch:
- accept only configured HTTP(S) destinations/ports;
- resolve and reject private, loopback, link-local, reserved, metadata, and other forbidden IP ranges for IPv4/IPv6;
- revalidate redirect targets and cap redirects;
- enforce MIME/byte/depth/resource bounds.

Inside LLM context:
- source text is data only;
- prompt/source delimiters explicitly forbid following instructions, tool requests, role changes, or secret requests from crawled content;
- source content never enters system/developer instruction roles.

Before rendering:
- sanitize source-derived Markdown/HTML;
- strip active content;
- validate source images with the same URL/resource guard;
- copy approved assets to InsForge Storage and render stored assets instead of arbitrary remote URLs.

See `specs/033-research-security-boundaries.md` and `docs/RESEARCH-PIPELINE.md`.

## Lesson generation

Lesson skeleton provides objectives, source pack references, ordering, and `required_prerequisites`. Job retrieves relevant chunks/assets, generates versioned structured JSON, validates, runs QC, and persists.

QC failure → regenerate full lesson once → second failure marks lesson failed.

A ready lesson then enqueues its assessment's question job.

## Project generation

Project skeletons/milestone ordering come from curriculum. `project` job creates storyline, milestone scenarios, prompts, hints, expected outcomes, and lesson mappings.

## Question generation

Each `question` job targets one assessment belonging to one ready lesson. It generates an oversized candidate set, validates correctness/ambiguity/taught scope, selects a final set, and persists questions/junctions atomically.

Question failure affects that assessment only and may lead to `ready_with_gaps`; the lesson remains usable.

## RAG chat

1. Embed query with TEI.
2. Course-scoped pgvector top-k retrieval.
3. Optionally prioritize current lesson/concept through filters/weights.
4. Build grounded context treating retrieved source text as untrusted data.
5. Call LiteLLM and stream through Fastify.
6. Store assistant message with citations/chunk IDs and `llm_call_id`.

No intent classifier or LLM reranker in V1.

## Realtime

Web subscribes to relevant InsForge Realtime job/course changes and also polls every 5 seconds. Either mechanism may update the same TanStack Query cache.

## Observability

V1 uses Pino structured logs to stdout plus `llm_calls` records for model, prompt version, tokens, latency, cost, and request IDs. Never log raw source bodies/secrets unnecessarily. Sentry/OpenTelemetry deferred.

## Milestone integration gates

Each implementation milestone must prove the newly connected chain immediately using the fixed Redis fixture. The authoritative gate list is in `AGENTS.md`; comprehensive late regression specs do not replace these earlier checks.
