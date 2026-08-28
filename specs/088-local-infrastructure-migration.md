# 088 — Local infrastructure migration

## Goal

Replace InsForge with a local Docker Compose stack while preserving Lumi's
application data, authorization, job semantics, vector retrieval, and product
flows.

## Locked decisions

- PostgreSQL 16 with pgvector 0.7.4 compatibility is the application database.
- Better Auth 1.6.23 provides Google OAuth, database sessions, bearer sessions,
  and local email/password authentication.
- MinIO stores private lesson/research assets.
- Web, API, worker, and all supporting services run in Compose.
- Existing application IDs and rows are preserved through an offline snapshot;
  old sessions, password hashes, and OAuth tokens are not migrated.
- The API remains the product-authorization boundary and additionally uses
  transaction-scoped PostgreSQL identity plus forced RLS.
- Polling remains the generation update mechanism. No realtime replacement or
  dual-write compatibility layer is in scope.
- Unverified password signup is local-development-only, cannot claim an
  imported/Google email, and is rejected by production-mode configuration.

## Required topology

`web -> api -> postgres/pgvector + minio`; `worker -> postgres/pgvector + minio
+ litellm + searxng + crawl4ai + tei`. LiteLLM retains its isolated database.
Only localhost-bound ports may be published.

## Data and identity contracts

- Keep application `users.id` UUIDs and link them to Better Auth through
  `users.auth_user_id`.
- Add Better Auth-prefixed user/session/account/verification tables.
- Add `courses.owner_user_id`, backfill from owner enrollments, then make it
  non-null before enforcing RLS.
- Import only allowlisted application tables and safe identity metadata. Never
  export secrets, passwords, sessions, or provider tokens.
- Preserve 384-dimensional BGE-small embeddings, model/version metadata, job
  state, idempotency constraints, and HNSW cosine retrieval.

## Release gate

The release is NO-GO until import reconciliation, RLS isolation, Better Auth,
MinIO delivery, deterministic authenticated browser E2E, and clean-volume
backup restore all pass against the Compose topology. The cutover and rollback
boundary is defined in `docs/infrastructure-migration/RUNBOOK.md`.

## Execution

Run `docs/infrastructure-migration/tickets/T01-*.md` through `T19-*.md` in
order. Each ticket is one bounded commit and must update the status matrix.
