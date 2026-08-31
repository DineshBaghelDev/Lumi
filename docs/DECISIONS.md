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

## Infrastructure

- MinIO server is pinned to a specific release tag (`RELEASE.2025-09-07T16-13-09Z`), not `latest`, to prevent unexpected upgrades from breaking the stack.
- MinIO mc init container uses `latest@sha256` (different release cycle from the server) and runs once with `restart: "no"`.
- MinIO bucket policy is `private` — assets are not publicly accessible.
- MinIO has `restart: unless-stopped` for crash resilience.
- `compose.yaml` uses LF line endings (`.gitattributes` enforces `*.yaml`/`*.yml` as `eol=lf`).
- Dockerfile `deps` stage copies ALL source code before `pnpm install` to avoid later `COPY` instructions destroying pnpm workspace symlinks. Build stages do not re-COPY source or re-run `pnpm install`.
- Next.js web target runs from `WORKDIR /app/apps/web` and uses `next/dist/bin/next` directly (not the `.bin` shell shim).
- Build-time placeholder env vars satisfy Next.js auth config validation during `next build`; real values are injected at runtime by `compose.yaml`.

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
- Live routing (2026-08-26): `gpt-5.5` is served by Groq `openai/gpt-oss-120b` with OpenRouter as a named fallback deployment. OpenRouter balance cannot cover curriculum-sized `max_tokens` (402), so Groq is the effective generation provider until credits are added or codex-as-api returns.
- Model selection at course creation: the model chosen during course creation is snapshotted and used for all generation calls for that course (curriculum, lessons, assessments, chat). If the selected model fails, LiteLLM automatically falls back to the next available provider in the fallback chain. If no providers are available, the course generation fails with a clear error. Users should see which providers are available in Settings and can add their own API keys for additional providers.
- Provider status (2026-08-31): codex-as-api v0.6.5 is broken with gpt-5.5 — the ChatGPT OAuth backend rejects Chat Completions format requests. Kimi/Moonshot API key is invalid. Groq is the only working provider. OpenRouter has balance but charges per token. Default is Groq (`groq-gpt-5.5`).
- Provider/model catalog is a single source of truth in `@lumi/config` (`availableProviders` array). Both the API (`GET /providers`) and the worker (`resolveModelProvider`) consume it; no duplicate hardcoded lists elsewhere.
- Users can bring their own provider API keys. Keys are AES-256-GCM encrypted at rest using a dedicated `PROVIDER_ENCRYPTION_KEY` passphrase (falls back to `LITELLM_API_KEY` if unset). Provider and model strings are validated against the config catalog at both the API boundary (course creation, key save/delete) and the worker (model-to-provider resolution).
- Each course snapshots its selected model at creation time in `course_generation_usage.limits.model`. Worker handlers resolve the per-course provider key and build a per-course `LiteLlmClient` config for every LLM call. Chat and grading fall back to env defaults when no per-course model is set.
- LLM prompts must embed the exact JSON output shape (skeleton), not just key names. gpt-oss-120b guesses wrong shapes from prose-only prompts.
- Deterministic QC rules must be stated verbatim in the prompt (e.g., prerequisite names, citation requirements); the model cannot infer gate mechanics.
- Groq free tier enforces an 8000 tokens-per-minute cap per request including `max_tokens`; lesson calls are budgeted (~2200 prompt + 5000 completion worst case). Reasoning tokens count against completion budgets on gpt-oss models.
- TEI rejects requests containing any input beyond its token limit with HTTP 413 regardless of batch composition; embedding clients must size-bound batches, split on 413, and truncate single oversized inputs rather than failing the job permanently.
- Postgres polling queue instead of Redis.
- API writes jobs; worker polls. No direct API→worker call.
- One worker process must fan out into `WORKER_CONCURRENCY` independent polling slots; DB claim rules remain the source of truth for global and per-course limits.
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

## Known operational constraints (from live pipeline testing, 2026-08-26)

Issues hit during end-to-end testing that will recur; documented so they are recognized fast.

- InsForge signup enforces email verification (`requireEmailVerification: true`) and OTP codes are stored hashed, so automated/headless testing cannot complete email auth. Workaround: create a throwaway user via the SDK, set its `email_verified` through `insforge-cli db query`, then sign in for a JWT. Google OAuth cannot be automated headlessly.
- OpenRouter credits exhausted mid-test with HTTP 402 surfaced by LiteLLM as a permanent job failure. Keep at least one provider route with confirmed balance before running generation.
- Groq free tier intermittently returns 429 under parallel lesson load even when each request fits the TPM cap; worker backoff handles it but can exhaust 3 attempts on long lessons. Expect manual `POST /generation-jobs/:id/retry` calls after rate-limit storms.
- Docker Desktop on this machine intermittently fails E: drive bind mounts (`mkdir /run/desktop/mnt/host/e: file exists`); a full Docker Desktop restart fixes it. Recreate compose services after any engine restart.
- The API masked framework errors as 500: non-HttpError Fastify errors (e.g., FST_ERR_CTP_INVALID_MEDIA_TYPE) were rendered as `internal_error` regardless of their real status. Fixed in `apps/api/src/app.ts`, but new error paths must keep honoring 4xx `statusCode`.
- Worker job outcomes were invisible outside the database; console logging now exists in `runClaimedJob`. Any new handler must run through it to stay observable.
- Before 2026-08-28, the worker process only awaited one claimed job at a time despite the configured concurrency value. The process now starts one polling loop per configured slot, each with a stable worker-id suffix for bounded ownership and shutdown draining.
- Failed LLM calls are not recorded in `llm_calls` — tracking only captures successes, so spend/failure observability has a blind spot. Changing this alters spec 012 behavior and needs an explicit spec decision first.
- Course status can remain `ready_with_gaps` after a late lesson retry succeeds: `updateCourseStatus` sees its own still-running job and never re-evaluates to `ready`. Late retries may need a status re-check or the final job should update course state after terminal transition.
- Manual retry reuses the same job row, so retry history is not preserved per attempt beyond the `attempts` counter.
- InsForge project memory (`memory remember`) requires a paid plan; repo docs (`docs/`, `context/`) are the system of record for findings and decisions in this environment.
- `INTERNAL_API_BASE_URL` is required in `.env` for local development. The web server (Next.js, port 3000) uses it to reach the API server (Fastify, port 3001) via server-side `fetch()`. If missing, `apiFetch()` throws and returns HTTP 503 with a generic message, hiding the real cause. Docker Compose sets it automatically (`http://api:3001`), so this only breaks local setups that copy `.env.example` incompletely. The variable must be present even though `NEXT_PUBLIC_API_BASE_URL` (client-side) is a different variable.
