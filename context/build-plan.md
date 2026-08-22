# Build Plan

## Active milestone

Milestone 2 — Research

Current detailed focus: `024-litellm-client.md`

## Execution rule

Implement by milestone, not by one-file spec stops.

The numbered files in `specs/` are detailed requirement packets. Use them for
acceptance criteria and tests, but group related packets whenever that produces
one coherent implementation slice. Do not wait on artificial numeric boundaries
when a shared schema, API, worker, or UI change is naturally smaller as one
change.

Every slice must still:

- follow the source-of-truth order in `AGENTS.md`;
- stay inside the active milestone unless a dependency requires a narrow cross-milestone edit;
- preserve security, budget, job-state, validation, and idempotency contracts;
- update `context/progress-tracker.md` with the specs or milestone pieces completed;
- pass the relevant targeted checks;
- pass the milestone integration gate before the milestone is considered complete.

## Milestones

1. **Foundation** — monorepo, env, Docker services, InsForge, Google OAuth, Drizzle, Fastify, canonical job state/idempotency, generation budgets/cancellation, worker queue, `POST /courses` stub.
2. **Research** — LiteLLM, SearXNG, Crawl4AI, TEI, concept maps, source ranking/protection, research security boundaries, crawling/chunking/embeddings, gap loop, assets.
3. **Course generation** — curriculum, modules, lesson/assessment/project skeletons, roadmap and generation progress.
4. **Lessons** — content contract, source retrieval, generation, QC, Mermaid/images/code, renderer; each ready lesson enqueues its own question job.
5. **Projects** — project jobs, progressive storyline, milestones, hints, project UI.
6. **Assessments** — per-lesson question generation, validation, scoring, assessment UI, guidance flags.
7. **Learning experience** — progress, skip/resume, notes/bookmarks, RAG chat/citations.
8. **Hardening** — full integration/pipeline/E2E regression, retry UX, loading/error states, final polish.

## Gate rule

At each milestone boundary, run the detailed integration gate defined in
`docs/IMPLEMENTATION-PLAN.md`. The golden Redis-topic fixture remains the shared
end-to-end proving path.

## Current checkpoint

Planning and Milestone 1 are complete. Implementation is in progress in
Milestone 2. The current Research focus starts with the LiteLLM client.
