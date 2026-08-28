# Audit closure and infrastructure migration

Date: 2026-08-28

## Case status

The release-readiness audit fixes were implemented in separate commits on the
repository `main` branch. The remaining InsForge changes were not applied:
InsForge's CLI and migration runner authenticate as `project_admin`, while the
existing public tables are owned by an InsForge-managed PostgreSQL role. RLS
migration attempts failed with `must be owner of table assessments` and rolled
back. The isolated `lumi-release-hardening` branch has no changes to merge.

No production schema or data changes were made through InsForge.

## Verified completed work

- Web proxy SSRF, external-origin, bearer-token, timeout, and response-size
  protections.
- Course status reconciliation after terminal generation jobs.
- API course/LLM budget checks, chat ownership checks, citation normalization,
  and assessment idempotency handling.
- Topic-specific research discovery, evidence coverage, prompt-injection
  detection, and crawler redirect/DNS/private-network validation.
- Authenticated web shell behavior, sign-out, learner progress/resume, notes,
  bookmarks, mutation feedback, lesson rendering, assessment recovery, chat
  thread continuity, worker concurrency, and documentation corrections.
- Hermetic release-journey Playwright coverage was added. Full browser E2E was
  not accepted as passed because the local Next/process environment caused the
  run to hang/fail before a complete journey could be verified.

Relevant verification completed: typecheck 7/7, lint 7/7, API tests 37/37, web
tests 13/13, and research tests 10/10.

## Remaining audit and release work

These items remain open and must be handled during the infrastructure switch:

1. Replace InsForge database access with self-hosted PostgreSQL and enable RLS
   as a real tenant boundary.
2. Replace InsForge Storage with MinIO and upload/serve lesson assets rather
   than persisting metadata-only paths.
3. Replace InsForge Auth/OAuth session handling with Better Auth and re-test
   protected-route redirects, sign-out, refresh, and OAuth callbacks.
4. Move embeddings and vector retrieval to PostgreSQL with pgvector; preserve
   embedding dimensions, model/version metadata, chunk ownership, and query
   ranking semantics.
5. Run the complete authenticated browser journey against the real local
   Docker topology, including generation, lesson reading, assessment,
   project, chat, notes/bookmarks, reload/resume, retry, and cancellation.
6. Add deployment, TLS/ingress, secrets, observability, backup, restore, and
   migration rehearsal evidence for the new topology.
7. Re-check accessibility and remaining UX polish after auth and storage
   replacement.

## Approved infrastructure direction

The project will move from InsForge-managed services to Docker-managed
components:

- PostgreSQL for relational data and migrations.
- MinIO for private object storage and lesson assets.
- Better Auth for authentication, sessions, OAuth, and account lifecycle.
- PostgreSQL `pgvector` for embeddings and vector similarity search.

This is a major architecture migration, not a drop-in provider swap. It must
be planned and delivered as a separate migration effort with staged cutover,
rollback, and data verification.

## Migration work breakdown

### 1. Baseline and contracts

- Freeze the current schema and record row counts, foreign keys, indexes,
  enums, JSON fields, and vector dimensions.
- Inventory every InsForge SDK, auth cookie, storage URL, realtime call, and
  database access path.
- Define local Docker services, persistent volumes, health checks, networks,
  ports, and development/test environment variables.
- Decide the migration cutover and rollback point before moving data.

### 2. PostgreSQL and pgvector

- Add PostgreSQL and the pgvector extension to the Docker topology.
- Port the Drizzle schema and migrations to the self-hosted connection.
- Add RLS policies, grants, ownership rules, and service-role boundaries for
  every application table.
- Migrate course, learner, chat, assessment, research, asset, and usage data.
- Rebuild embeddings in pgvector or import them only after validating model,
  dimensions, and provenance metadata.
- Verify counts, foreign-key integrity, authorization queries, and vector
  retrieval relevance before cutover.

### 3. Better Auth

- Define the Better Auth database schema and adapter.
- Map existing user IDs and provider identities without breaking ownership
  references.
- Reimplement sign-in, OAuth callback, session refresh, sign-out, and route
  protection.
- Configure secure cookies, CSRF/origin checks, redirect allowlists, and
  production secrets.
- Test anonymous access, authenticated access, session expiry, refresh,
  account linking, and logout across web and API.

### 4. MinIO

- Add MinIO with a persistent Docker volume and private bucket policy.
- Implement server-side upload/download or signed URLs; never expose admin
  credentials to the browser.
- Copy existing objects if any exist, then verify hashes and metadata.
- Update asset records and lesson rendering to use the new object keys.
- Test missing objects, unauthorized access, expiry, retry, and cleanup.

### 5. Application and worker cutover

- Replace centralized InsForge factories with PostgreSQL, Better Auth, and
  MinIO adapters while keeping product authorization in the API.
- Replace realtime assumptions with the approved polling/refresh behavior or
  explicitly add a supported realtime service later.
- Update worker research, asset, embedding, and generation paths.
- Preserve idempotency, quotas, cancellation, retries, and failure states.
- Update docs, environment templates, Docker compose, CI, and deployment
  instructions.

### 6. Verification and release gate

- Run schema and data reconciliation reports before and after cutover.
- Run unit, integration, typecheck, lint, and authenticated Playwright tests.
- Exercise backup restore on a clean PostgreSQL/MinIO installation.
- Confirm no InsForge URL, key, auth cookie, storage call, or SDK dependency
  remains in an active production path.
- Release only after the full generation-to-resume journey passes against the
  Docker topology.

## Explicit non-goals for this closed case

- No unsupported attempt to change InsForge table ownership.
- No direct production data rewrite or destructive migration.
- No claim that the new PostgreSQL/MinIO/Better Auth/pgvector stack exists or
  is production-ready; that is the next project phase.

