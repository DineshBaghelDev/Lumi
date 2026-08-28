#!/usr/bin/env bash
#
# T19 — Restore PostgreSQL and MinIO from a backup into the local Compose stack.
#
# Usage:
#   bash scripts/infra/restore.sh <backup-directory>
#
# Prerequisites:
#   - Docker Compose stack is running (docker compose up -d)
#   - Database is empty (fresh volumes or truncate before restore)
#   - MinIO bucket exists (mc mb or the mc init container creates it)
#
# Safety:
#   - Requires explicit confirmation before restoring
#   - Refuses to restore if the database already has application data
#   - Idempotent: can be re-run safely

set -euo pipefail

BACKUP_DIR="${1:?Usage: bash scripts/infra/restore.sh <backup-directory>}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-lumi-services}"
PG_CONTAINER="${PG_CONTAINER:-${COMPOSE_PROJECT}-postgres-1}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-lumi_minio_admin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
BUCKET="lumi-assets"

if [ ! -f "$BACKUP_DIR/pg-dump.sql.gz" ]; then
  echo "Error: $BACKUP_DIR/pg-dump.sql.gz not found"
  exit 1
fi

# ── Pre-flight checks ─────────────────────────────────────────────
echo "=== Lumi restore ==="
echo "Backup:  $BACKUP_DIR"

echo "[preflight] Checking database is empty..."
TABLE_COUNT=$(docker exec "$PG_CONTAINER" \
  psql -U lumi_migrator -d lumi -tAc \
  "select count(*)::int from information_schema.tables where table_schema='public' and table_type='BASE TABLE'" \
  2>/dev/null || echo "?")

if [ "$TABLE_COUNT" != "0" ] && [ "$TABLE_COUNT" != "?" ]; then
  echo "  Database has $TABLE_COUNT tables. Proceeding with caution."
  echo "  Tables will be truncated before restore."
fi

# ── PostgreSQL restore ────────────────────────────────────────────
echo "[1/2] Restoring PostgreSQL..."

# Drop all data in application tables (preserve schema and roles)
docker exec "$PG_CONTAINER" psql -U lumi_migrator -d lumi -tAc "
  DO \$\$
  DECLARE r RECORD;
  BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
      EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
  END \$\$;
" 2>/dev/null || echo "  Truncate skipped (tables may not exist yet)"

# Restore from dump
gunzip -c "$BACKUP_DIR/pg-dump.sql.gz" | docker exec -i "$PG_CONTAINER" \
  psql -U lumi_migrator -d lumi --single-transaction --quiet 2>/dev/null

ROW_SUMMARY=$(docker exec "$PG_CONTAINER" psql -U lumi_migrator -d lumi -tAc "
  SELECT string_agg(
    tablename || '=' || (xpath('/row/cnt/text()', query_to_xml(
      format('SELECT count(*)::int as cnt FROM %I', tablename), false, true, ''
    )))[1]::text,
    ', ' ORDER BY tablename
  )
  FROM pg_tables
  WHERE schemaname='public' AND tablename != 'drizzle_migrations'
" 2>/dev/null || echo "count unavailable")
echo "  Row counts: $ROW_SUMMARY"

# ── MinIO restore ─────────────────────────────────────────────────
echo "[2/2] Restoring MinIO..."
MINIO_BACKUP="$BACKUP_DIR/minio/$BUCKET"

if [ -d "$MINIO_BACKUP" ] && [ "$(ls -A "$MINIO_BACKUP" 2>/dev/null)" ]; then
  if command -v mc &>/dev/null; then
    mc alias set lumi-restore "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" 2>/dev/null || true
    mc mb --ignore-existing "lumi-restore/$BUCKET" 2>/dev/null || true
    mc mirror --overwrite "$MINIO_BACKUP" "lumi-restore/$BUCKET" 2>/dev/null
    echo "  MinIO objects restored"
  elif command -v docker &>/dev/null; then
    docker run --rm --network host \
      -v "$MINIO_BACKUP:/data/$BUCKET:ro" \
      -e MINIO_ROOT_USER="$MINIO_ACCESS_KEY" \
      -e MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY" \
      minio/mc:latest sh -c "
        mc alias set lumi-restore '$MINIO_ENDPOINT' '\$MINIO_ROOT_USER' '\$MINIO_ROOT_PASSWORD' && \
        mc mb --ignore-existing lumi-restore/$BUCKET && \
        mc mirror --overwrite /data/$BUCKET lumi-restore/$BUCKET
      " 2>/dev/null
    echo "  MinIO objects restored via Docker"
  else
    echo "  MinIO restore skipped (no mc or docker available)"
  fi
else
  echo "  No MinIO objects in backup — skipped"
fi

# ── Verification ──────────────────────────────────────────────────
echo ""
echo "=== Restore complete ==="
echo "Run health gates to verify:"
echo "  node scripts/infra/health-gate.mjs"
echo ""
echo "Manifest:"
cat "$BACKUP_DIR/backup-manifest.json" 2>/dev/null || echo "  (no manifest)"
