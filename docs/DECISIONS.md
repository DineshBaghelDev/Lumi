# Decision Ledger

## Product

- Curriculum is fixed after generation; assessments flag weak areas rather than mutating the curriculum.
- Full-depth lessons retain important concepts even if a learner may already know them.
- V1 has no pre-course diagnostic.
- Guided projects teach through progressive scenarios; they are not scored coding assessments.
- Users code locally; V1 has no embedded IDE or repository review.
- Post-lesson assessment types exclude full implementation/mini-project grading.
- MCQ feedback is immediate; other question types grade at final submission.
- Each ready lesson gets its assessment generated immediately; assessments do not wait for the whole course to finish generating.

## Research

- Research is required for reliable senior-level depth.
- Expected concept/prerequisite map is built before source collection so missing prerequisites are discoverable.
- SearXNG discovers URLs; Crawl4AI extracts content.
- Official sources are protected from early filtering.
- Use 2–5 best sources per concept rather than a tiny source set for the whole course.
- Files/Storage/relational rows remain source of truth; embeddings are a retrieval index.
- BAAI/bge-small-en-v1.5 via TEI, 384 dimensions, pgvector HNSW cosine.
- Hugging Face TEI is authoritative for embeddings. Any LM Studio embedding reference is stale.
- Internet research content is untrusted. SSRF/redirect/resource limits, prompt-injection isolation, sanitization, and safe asset storage are mandatory before arbitrary web content reaches downstream systems.

## Cost/control

- Every course has hard config-driven generation limits snapshotted at creation.
- Enforce bounds for LLM usage/cost, research loops/search/crawl volume, concepts, and lessons.
- Generation can be explicitly cancelled; budget exhaustion also stops future work while preserving completed content.
- Generation usage counters are atomic and shared by concurrent worker jobs.

## Architecture

- TypeScript/Node application code only.
- Turborepo monorepo.
- Next.js + Tailwind + shadcn/ui.
- Fastify API.
- Drizzle.
- InsForge Cloud for database/auth/storage/realtime.
- Keep a real backend/worker repo; do not place core orchestration in hosted edge functions.
- Google OAuth only in V1; email auth deferred to V1.1.
- LiteLLM owns model routing. In the MVP development environment, codex-as-api is the primary generation provider and OpenRouter is fallback.
- Postgres polling queue instead of Redis.
- API writes jobs; worker polls. No direct API→worker call.
- Realtime generation updates plus 5-second polling fallback.

## Jobs

- Five job types: research, curriculum, lesson, project, question.
- Canonical states: queued, running, succeeded, failed, cancelled.
- DB constraints enforce logical job uniqueness/idempotency.
- Research is one internally orchestrated job in V1.
- Curriculum creates lesson/assessment/project skeletons.
- Project content uses independent project jobs to reduce curriculum failure blast radius.
- Lessons can generate out of order; max 3 concurrent lesson jobs per course.
- Successful lesson job enqueues one question job for that assessment immediately.
- Curriculum failure is fatal; item-level lesson/project/question failure supports partial course usability.

## Content/QC

- Lesson `content_json` is strict, versioned, Zod-validated structured content.
- Mermaid is a first-class lesson block type.
- Lesson QC failure triggers one full regeneration; block-level patching deferred.
- Promptfoo/Ragas/DeepEval deferred; V1 uses custom deterministic checks + separate reviewer pass.

## Development workflow

- 87 bounded implementation specs are executed in dependency order.
- Cross-layer milestone integration gates run at every milestone boundary rather than being postponed to final hardening. Detailed gate definitions live in `docs/IMPLEMENTATION-PLAN.md`; `AGENTS.md` defines that gates are mandatory.
- V1 has no Redis queue. Redis wording in fixtures refers to the learning topic unless an approved spec explicitly says otherwise.
- CodeRabbit is intentionally skipped for this MVP environment; independent reviewer subagents remain mandatory.
- If implementation reveals an invalid assumption, update decisions/docs/specs before allowing code to diverge.

## Chat

- Course-scoped BGE embedding + pgvector top-k retrieval.
- No intent-classification LLM call in V1.
- No LLM reranker in V1.
- Store retrieved chunk IDs with assistant messages and link chat messages to `llm_calls`.
