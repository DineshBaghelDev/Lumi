# Lumi

Lumi is a source-grounded technical learning app. A learner gives it a topic and goal; Lumi researches trusted sources, builds a fixed curriculum, generates lessons, assessments, and guided projects in the background, then keeps progress, notes, bookmarks, and course-aware chat tied to that course.

Current state: foundation work is in progress. The web app exists, Google OAuth is wired, shared config is typed, and the local research service stack is defined. The API and worker packages are still placeholders until their specs are implemented.

## Stack

- Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Fastify API and Node/TypeScript worker
- InsForge Cloud for auth, Postgres, storage, and realtime
- Drizzle for schema and migrations
- LiteLLM for model routing
- SearXNG, Crawl4AI, and Hugging Face TEI for research and embeddings
- pnpm workspaces and Turborepo

## Prerequisites

- Node.js
- pnpm 11.22.0
- Docker Desktop
- InsForge project credentials

## Setup

```sh
pnpm install
cp .env.example .env
```

Fill in `.env` with the InsForge and LiteLLM values. Keep real credentials out of `.env.example`.

## Start Local Services

```sh
docker compose config --quiet
docker compose up -d
docker compose ps
```

Service endpoints:

- LiteLLM: `http://127.0.0.1:4000/health/liveliness`
- SearXNG: `http://127.0.0.1:8080/search?q=lumi&format=json`
- Crawl4AI: `http://127.0.0.1:11235/health`
- TEI: `http://127.0.0.1:8081/health`

Use `docker compose stop` to stop services. Avoid `docker compose down -v` unless you want to delete the SearXNG and TEI caches.

## Start The App

```sh
pnpm dev
```

The web app runs through Next.js at `http://localhost:3000`. The API and worker currently run placeholder scripts until their foundation specs land.

## Checks

```sh
pnpm workspace:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the smallest relevant check while developing, then run the broader checks before handing off a completed spec.

## Repo Map

- `apps/web` - Next.js app and auth routes
- `apps/api` - future Fastify API package
- `apps/worker` - future background worker package
- `packages/config` - typed environment parsing and V1 defaults
- `packages/db` - InsForge server client helpers
- `packages/shared` - shared package placeholder
- `services` - local LiteLLM, SearXNG, Crawl4AI, and TEI configuration
- `context` - current project state and agent-facing handoff docs
- `docs` - durable product and architecture docs
- `specs` - numbered implementation specs

## Development Rules

Use `context/progress-tracker.md` to see the current spec and completed work. Implement specs in numeric order unless an approved dependency change says otherwise. Product source of truth is `specs/`, then `docs/`, then `context/`, then existing code.
