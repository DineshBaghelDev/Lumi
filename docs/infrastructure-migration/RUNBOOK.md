# Migration runbook

## Safety boundary

InsForge is read-only throughout migration. Do not apply Drizzle, Better Auth,
Prisma, role, ownership, or RLS changes to it. Never use `docker compose down
-v` for the working stack.

## Rehearsal

1. Start Docker Desktop and confirm `docker version` succeeds.
2. Generate a read-only baseline with the T01 exporter:
   ```bash
   node scripts/migration/export-insforge.mjs
   ```
3. Build and start the local stack with disposable test volumes:
   ```bash
   docker compose -f compose.yaml -f compose.test.yml up -d --build
   docker compose -f compose.yaml -f compose.test.yml ps
   ```
4. Apply local migrations with the migrator role.
5. Import identities and allowlisted application rows:
   ```bash
   pnpm migration:identities -- <archive-directory>
   pnpm migration:application -- <archive-directory>
   ```
6. Reconcile counts, hashes, FKs, owners, vectors, and retrieval samples.
7. Run T17 integration gates:
   ```bash
   TEST_DATABASE_URL=postgresql://lumi_migrator:test-migrator-pw@127.0.0.1:6432/lumi \
     node scripts/infra/health-gate.mjs
   TEST_DATABASE_URL=postgresql://lumi_migrator:test-migrator-pw@127.0.0.1:6432/lumi \
     node scripts/infra/pgvector-gate.mjs
   ```
8. Run T18 real authenticated E2E (requires web+api+postgres+minio running):
   ```bash
   npx playwright test apps/web/e2e/local-journey.spec.ts
   ```
9. Back up and restore into separate volumes, then reconcile:
   ```bash
   bash scripts/infra/backup.sh
   bash scripts/infra/restore.sh backups/local-<timestamp>
   TEST_DATABASE_URL=postgresql://lumi_migrator:test-migrator-pw@127.0.0.1:6432/lumi \
     node scripts/infra/reconcile-gate.mjs
   ```

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
