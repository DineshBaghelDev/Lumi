# Learning Engine

A source-grounded technical learning product that turns a topic into a polished, full-depth course with lessons, assessments, guided projects, progress tracking, and course-aware RAG chat.

## Core experience

1. User enters a topic and learning goal.
2. Bounded background research builds an expected concept map, finds trusted sources, securely crawls/indexes them, detects coverage gaps, and creates concept-specific source packs.
3. A fixed curriculum is generated from the research corpus.
4. Lesson and project jobs generate content in the background; ready lessons become usable immediately.
5. Each successful lesson immediately starts generation of its own post-lesson assessment.
6. Guided projects teach implementation through progressive scenarios and hints, while users write code in their own local environment.
7. Progress, notes, bookmarks, weak-topic flags, and RAG chat persist across sessions.

## V1 safety/control

- Crawled internet content is untrusted: SSRF/redirect/resource guards, prompt-injection isolation, sanitization, and safe asset storage are required.
- Every course has hard configurable generation budgets and explicit cancellation.
- Job lifecycle/idempotency is enforced by canonical states and database uniqueness constraints.

## V1 stack

- Web: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- API: Fastify
- Worker: Node.js/TypeScript background worker
- Database/Auth/Storage/Realtime: InsForge Cloud
- ORM/migrations: Drizzle
- LLM routing: LiteLLM, with codex-as-api as the primary development provider and OpenRouter fallback
- Search: SearXNG
- Crawl/extraction: Crawl4AI
- Embeddings: BAAI/bge-small-en-v1.5 via Hugging Face TEI, 384 dimensions
- Vector search: pgvector HNSW cosine index
- Monorepo: pnpm + Turborepo

## Repo documentation

- `AGENTS.md` — execution contract for coding agents
- `context/` — short, current, agent-facing operational context
- `docs/` — detailed durable product and system specifications
- `specs/` — 87 small implementation-ready specs, one bounded change each

Start with `context/project-overview.md`, then `context/build-plan.md`, then execute the active spec.
# Lumi
