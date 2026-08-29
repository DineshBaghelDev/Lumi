# Lumi

A source-grounded technical learning platform. A learner provides a topic and learning goal; Lumi researches trusted sources, builds a structured curriculum, and generates lessons, assessments, and guided projects in the background — then tracks progress, notes, bookmarks, and course-aware chat tied to each course.

**Status:** V1 complete. All 87 implementation specs delivered. Docker Compose stack with PostgreSQL/pgvector, Better Auth, MinIO, and containerized services is operational. See `context/progress-tracker.md` for verification history.

---

## Applications

Lumi ships three applications in a single monorepo:

### Web (`apps/web`)

Next.js 16 server-rendered app. Handles authentication (Better Auth with Google OAuth and email/password), course creation, dashboard, roadmap/lesson rendering, assessment runner, guided projects, course chat with RAG citations, notes/bookmarks, and progress tracking.

- Runs on `http://127.0.0.1:3000`
- Proxies API requests to the Fastify backend via `/api/proxy/[...path]`
- Auth routes at `/api/auth/*`

### API (`apps/api`)

Fastify REST API. Serves all course, curriculum, lesson, assessment, project, progress, notes, chat, and asset endpoints behind Better Auth session or bearer token authentication. Uses transaction-scoped PostgreSQL identity with forced RLS for per-user data isolation.

- Runs on `http://127.0.0.1:3001`
- Health check: `GET /health`
- Requires `Idempotency-Key` header on `POST /courses`

### Worker (`apps/worker`)

Background job processor. Polls `generation_jobs` with `FOR UPDATE SKIP LOCKED`, claims jobs, and runs five handler pipelines: research, curriculum, lesson, project, and question. Supports configurable concurrency (default 5 parallel slots), heartbeat, stale lock reclamation, and retry with exponential backoff.

- No public port — runs as a long-lived process
- Waits for all dependent services (LiteLLM, SearXNG, Crawl4AI, TEI) before starting
- Worker role has `BYPASSRLS` for direct data access

---

## Shared Packages

| Package | Purpose |
| --- | --- |
| `packages/auth` | Better Auth integration — session resolver, email/password, Google OAuth, bearer plugin |
| `packages/config` | Typed environment parsing with V1 defaults and generation budget limits |
| `packages/db` | Drizzle schema, RLS policies, migration history, job lifecycle, course/RAG services |
| `packages/llm` | LiteLLM client — chat, structured output, streaming, LLM call tracking |
| `packages/shared` | Versioned Zod contracts for curriculum, lessons, questions, projects, scoring |
| `packages/storage` | MinIO client — writer/reader clients, put/stat/get/remove, bucket lifecycle |

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API | Fastify 5, TypeScript |
| Database | PostgreSQL 16 with pgvector 0.7.4 (HNSW cosine indexing, 384-dim embeddings) |
| Auth | Better Auth 1.6.23 (Google OAuth, email/password, sessions, bearer tokens) |
| Object Storage | MinIO (private lesson/research assets) |
| ORM | Drizzle ORM |
| LLM Routing | LiteLLM (model routing with Groq/OpenRouter providers) |
| Research | SearXNG (search), Crawl4AI (web crawling), Hugging Face TEI (embeddings) |
| Build | pnpm workspaces, Turborepo |
| Containers | Docker Compose with multi-stage builds |

---

## Prerequisites

- Node.js 22+
- pnpm 11.22.0
- Docker Desktop (for PostgreSQL, MinIO, LiteLLM, SearXNG, Crawl4AI, TEI)

---

## Setup

```sh
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
```

Edit `.env` and fill in:
- Database passwords (4 distinct values for migrator, auth, api, worker roles)
- `BETTER_AUTH_SECRET` (random string, 32+ characters)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- MinIO root password and worker/reader secrets
- `LITELLM_API_KEY` and provider keys (Groq, OpenRouter)

---

## Running

### Full stack (recommended)

```sh
# Start all infrastructure services
docker compose up -d

# Verify health
docker compose ps

# Start application code in development mode (HMR)
pnpm dev
```

This starts the web app on `http://localhost:3000`, API on `http://localhost:3001`, and the worker as a background process. All infrastructure (PostgreSQL, MinIO, LiteLLM, SearXNG, Crawl4AI, TEI) runs in Docker.

### Infrastructure only (for production builds)

```sh
docker compose up -d postgres minio minio-setup litellm searxng crawl4ai tei
```

### Service endpoints

| Service | URL |
| --- | --- |
| Web | `http://127.0.0.1:3000` |
| API health | `http://127.0.0.1:3001/health` |
| PostgreSQL | `127.0.0.1:6432` (role-based access) |
| MinIO S3 | `http://127.0.0.1:9000` |
| MinIO Console | `http://127.0.0.1:9001` |
| LiteLLM | `http://127.0.0.1:4000` |
| SearXNG | `http://127.0.0.1:8080` |
| Crawl4AI | `http://127.0.0.1:11235` |
| TEI | `http://127.0.0.1:8081` |

### Stopping

```sh
docker compose stop        # stop containers (preserves data)
docker compose down -v     # stop and DELETE all data volumes
```

---

## Database

PostgreSQL runs with four application roles:

| Role | Access |
| --- | --- |
| `lumi_migrator` | Superuser — runs Drizzle migrations |
| `lumi_auth` | Better Auth tables only |
| `lumi_api` | Application tables with RLS (no bypass) |
| `lumi_worker` | Application tables with `BYPASSRLS` |

RLS policies enforce per-user data isolation on all 30 application tables. The worker bypasses RLS for background job processing. Schema and migrations are managed by Drizzle under `packages/db/drizzle/`.

---

## Data Migration

Tooling for migrating data from InsForge (or any source PostgreSQL) into the local stack:

```sh
# Export from source (read-only)
pnpm migration:baseline

# Import identities (Better Auth users + Google accounts)
pnpm migration:identities -- <archive-directory>

# Import application data (30 tables, idempotent)
pnpm migration:application -- <archive-directory>
```

See `docs/infrastructure-migration/` for the full migration runbook, 19-ticket plan, and cutover procedures.

---

## Generation Pipeline

When a learner creates a course, the worker executes this pipeline:

```
POST /courses
  → research (source discovery, crawling, chunking, embedding)
    → curriculum (module/lesson/project skeletons)
      → lesson jobs (parallel, max 3 per course)
        → question jobs (one per lesson assessment)
      → project jobs
```

Each stage checks hard budgets (LLM calls, cost, search queries, crawl volume, concepts, lessons) and supports cancellation. Failed jobs are retryable with exponential backoff (5s → 15s → 45s). Course status reflects pipeline state: `generating`, `ready`, `ready_with_gaps`, `failed`, or `cancelled`.

---

## Development

### Commands

```sh
pnpm dev              # start web + API + worker with HMR
pnpm build            # build all packages
pnpm test             # run all tests (unit + integration)
pnpm lint             # typecheck all packages
pnpm typecheck        # TypeScript strict checks
pnpm workspace:check  # validate dependency graph
```

### Running a single package

```sh
pnpm --filter @lumi/api test
pnpm --filter @lumi/worker typecheck
pnpm --filter @lumi/web build
```

### Integration tests (require running database)

```sh
TEST_DATABASE_URL=postgresql://lumi_migrator:password@127.0.0.1:6432/lumi \
  pnpm --filter @lumi/db test
```

### Container integration gates

```sh
# Full service health check
TEST_DATABASE_URL=postgresql://lumi_migrator:password@127.0.0.1:6432/lumi \
  node scripts/infra/health-gate.mjs

# pgvector retrieval verification
TEST_DATABASE_URL=postgresql://lumi_migrator:password@127.0.0.1:6432/lumi \
  node scripts/infra/pgvector-gate.mjs
```

### E2E tests

```sh
# Mock API journey (no running stack needed)
npx playwright test apps/web/e2e/release-journey.spec.ts

# Real authenticated journey (requires full stack)
npx playwright test apps/web/e2e/local-journey.spec.ts
```

---

## Repo Structure

```
lumi/
├── apps/
│   ├── web/          Next.js frontend + auth routes
│   ├── api/          Fastify REST API
│   └── worker/       Background job processor
├── packages/
│   ├── auth/         Better Auth integration
│   ├── config/       Environment parsing + V1 defaults
│   ├── db/           Drizzle schema + RLS + job services
│   ├── llm/          LiteLLM client wrapper
│   ├── shared/       Zod validation contracts
│   └── storage/      MinIO client + object operations
├── services/
│   ├── postgres/     Init scripts (roles, extensions)
│   ├── litellm/      LiteLLM config + README
│   ├── searxng/      SearXNG settings
│   ├── crawl4ai/     (config placeholder)
│   └── embeddings/   (config placeholder)
├── scripts/
│   ├── migration/    Data export/import tooling
│   └── infra/        Health gates, backup/restore
├── specs/            87 numbered implementation specs
├── docs/             Architecture, data model, UX flows, migration
├── context/          Agent-facing state and handoff docs
├── compose.yaml      Docker Compose stack definition
├── compose.test.yml  Disposable test volumes overlay
└── Dockerfile        Multi-stage build (web, API, worker)
```

---

## Architecture

```
┌─────────┐     ┌─────────┐     ┌──────────────────────────┐
│   Web   │────▶│   API   │────▶│ PostgreSQL + pgvector     │
│ Next.js │     │ Fastify │     │ Better Auth tables        │
└─────────┘     └────┬────┘     │ RLS per-user isolation    │
                     │          └──────────────────────────┘
                     │          ┌──────────────────────────┐
                     │          │ MinIO                     │
                     │─────────▶│ lumi-assets bucket        │
                     │          └──────────────────────────┘
                     │
┌─────────┐          │          ┌──────────────────────────┐
│ Worker  │──────────┘          │ LiteLLM (model routing)  │
│ (polls) │                     │ SearXNG (search)         │
│         │────────────────────▶│ Crawl4AI (crawling)      │
│         │                     │ TEI (embeddings)         │
└─────────┘                     └──────────────────────────┘
```

---

## Security

- All services bind to `127.0.0.1` only — no exposed ports to the network
- RLS policies enforce per-user data isolation on all application tables
- Worker role uses `BYPASSRLS` for background processing
- Research pipeline applies SSRF/private-network/metadata guards on all crawled URLs
- MinIO uses separate writer and reader credential pairs
- Better Auth sessions use `httpOnly`, `sameSite: lax`, `secure` cookies
- `.env` is gitignored — never commit credentials

---

## Contributing

1. Read `specs/` for the active specification
2. Read `context/` for current project state
3. Run `pnpm workspace:check` to validate the dependency graph
4. Make the smallest coherent change
5. Run relevant tests before committing
6. Follow existing code conventions — TypeScript strict, Zod validation at boundaries

---

## License

Private — not licensed for distribution.
