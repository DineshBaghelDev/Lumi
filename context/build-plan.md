# Build Plan

## Active spec

`specs/001-monorepo-skeleton.md`

## Milestones

1. **Foundation** — monorepo, env, Docker services, InsForge, Google OAuth, Drizzle, Fastify, canonical job state/idempotency, generation budgets/cancellation, worker queue, `POST /courses` stub.
2. **Research** — LiteLLM, SearXNG, Crawl4AI, TEI, concept maps, source ranking/protection, research security boundaries, crawling/chunking/embeddings, gap loop, assets.
3. **Course generation** — curriculum, modules, lesson/assessment/project skeletons, roadmap and generation progress.
4. **Lessons** — content contract, source retrieval, generation, QC, Mermaid/images/code, renderer; each ready lesson enqueues its own question job.
5. **Projects** — project jobs, progressive storyline, milestones, hints, project UI.
6. **Assessments** — per-lesson question generation, validation, scoring, assessment UI, guidance flags.
7. **Learning experience** — progress, skip/resume, notes/bookmarks, RAG chat/citations.
8. **Hardening** — full integration/pipeline/E2E regression, retry UX, loading/error states, final polish.

## Execution rule

Implement all **87 specs** in numeric order unless an explicit dependency permits parallel work. Each spec is one-shot sized and independently verifiable.

At each milestone boundary, run the golden Redis integration gate defined in `AGENTS.md`. Do not wait for the final test specs to discover cross-layer breakage.

## Current checkpoint

Planning complete. Security, budget, job-state, and per-lesson assessment patches are incorporated. No product code has been implemented yet.
