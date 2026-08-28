# Migration runbook

## Safety boundary

InsForge is read-only throughout migration. Do not apply Drizzle, Better Auth,
Prisma, role, ownership, or RLS changes to it. Never use `docker compose down
-v` for the working stack.

## Rehearsal

1. Start Docker Desktop and confirm `docker version` succeeds.
2. Generate a read-only baseline with the T01 exporter.
3. Build and start the local stack with health gates.
4. Apply local migrations with the migrator role.
5. Import identities and allowlisted application rows.
6. Reconcile counts, hashes, FKs, owners, vectors, and retrieval samples.
7. Run T17 and T18 gates.
8. Restore PostgreSQL and MinIO backups into a separate Compose project and
   repeat reconciliation.

## Final cutover

1. Tag the pre-migration commit and record current image/config identifiers.
2. Stop the InsForge-backed API and worker. Abort unless no job is `running`.
3. Take a fresh export; never reuse rehearsal data.
4. Import into empty local volumes and run all reconciliation gates.
5. Keep the local worker stopped until every dependency and live provider route
   required by queued jobs is healthy.
6. Run the deterministic authenticated E2E gate, then start the worker and
   enable local writes.

## Rollback

Before the first local write, stop Compose and return to the tagged
InsForge-backed build. After the first local write, do not return to InsForge:
that creates split-brain data. Restore the local backup or fix forward. Retain
the final export and pre-migration tag for 14 days.

## Evidence

Commit only redacted counts, hashes, command outcomes, and GO/NO-GO status.
Never commit dumps, emails, tokens, passwords, `.env`, or MinIO object bytes.
