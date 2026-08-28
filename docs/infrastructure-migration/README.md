# Local infrastructure migration

Authoritative requirements live in `specs/088-local-infrastructure-migration.md`.
This directory is the implementation handoff for small, sequential agents.

## Rules

- Execute one ticket per fresh session and one commit per ticket.
- Read only the ticket's required sources; edit only its write scope.
- Preserve unrelated work and never stage with `git add -A`.
- Never commit credentials, dumps, provider tokens, or migration output.
- Do not run migrations against InsForge. InsForge access is read-only export.
- Run the ticket's focused checks once after the implementation is complete.
- Record commit SHA, changed files, checks, and unresolved external risk in the
  ticket handoff before marking it done.
- Do not start a dependent ticket while its dependency is blocked.

## Target

The full local stack contains web, API, worker, PostgreSQL/pgvector, MinIO,
LiteLLM with its separate database, SearXNG, Crawl4AI, and TEI. Better Auth is a
shared application package used by web and API, not a standalone container.

## Status

| Ticket | State | Commit |
| --- | --- | --- |
| T01-T19 | ready | — |

Use `tickets/README.md` for ordering and dependencies. Operational cutover and
rollback commands belong in `RUNBOOK.md`; generated evidence belongs under the
ignored `backups/` directory, with only redacted summaries committed.
