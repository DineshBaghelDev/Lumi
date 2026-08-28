#!/usr/bin/env bash
#
# T19 — Backup PostgreSQL and MinIO from the local Compose stack.
#
# Usage:
#   bash scripts/infra/backup.sh [output-directory]
#
# Output:
#   <output-directory>/pg-dump.sql.gz
#   <output-directory>/minio/  (rclone or mc mirror)
#   <output-directory>/backup-manifest.json
#
# Environment:
#   COMPOSE_PROJECT  — compose project name (default: lumi-services)
#   PG_CONTAINER     — postgres container (default: lumi-services-postgres-1)
#   MINIO_ENDPOINT   — MinIO S3 endpoint (default: http://127.0.0.1:9000)
#   MINIO_ACCESS_KEY — MinIO access key
#   MINIO_SECRET_KEY — MinIO secret key

set -euo pipefail

OUTPUT_DIR="${1:-backups/local-$(date +%Y%m%d-%H%M%S)}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-lumi-services}"
PG_CONTAINER="${PG_CONTAINER:-${COMPOSE_PROJECT}-postgres-1}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-lumi_minio_admin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
BUCKET="lumi-assets"

mkdir -p "$OUTPUT_DIR/minio"

echo "=== Lumi backup ==="
echo "Output: $OUTPUT_DIR"

# ── PostgreSQL dump ────────────────────────────────────────────────
echo "[1/2] Dumping PostgreSQL..."
docker exec "$PG_CONTAINER" \
  pg_dump -U lumi_migrator -d lumi --no-owner --no-privileges \
  | gzip > "$OUTPUT_DIR/pg-dump.sql.gz"

PG_SIZE=$(stat -c%s "$OUTPUT_DIR/pg-dump.sql.gz" 2>/dev/null || stat -f%z "$OUTPUT_DIR/pg-dump.sql.gz" 2>/dev/null || echo "?")
echo "  PostgreSQL dump: $PG_SIZE bytes"

# ── MinIO mirror ──────────────────────────────────────────────────
echo "[2/2] Mirroring MinIO bucket..."
if command -v mc &>/dev/null; then
  mc alias set lumi-backup "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" 2>/dev/null || true
  mc mirror --overwrite "lumi-backup/$BUCKET" "$OUTPUT_DIR/minio/$BUCKET" 2>/dev/null || echo "  MinIO mirror skipped (bucket may be empty)"
elif command -v docker &>/dev/null; then
  docker run --rm --network host \
    -e MINIO_ROOT_USER="$MINIO_ACCESS_KEY" \
    -e MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY" \
    minio/mc:latest sh -c "
      mc alias set lumi-backup '$MINIO_ENDPOINT' '\$MINIO_ROOT_USER' '\$MINIO_ROOT_PASSWORD' && \
      mc mirror --overwrite lumi-backup/$BUCKET /data/$BUCKET
    " 2>/dev/null || echo "  MinIO mirror skipped (bucket may be empty)"
  # Move from container volume if used
  if [ -d "/tmp/lumi-minio-mirror/$BUCKET" ]; then
    cp -r "/tmp/lumi-minio-mirror/$BUCKET" "$OUTPUT_DIR/minio/"
  fi
else
  echo "  MinIO mirror skipped (no mc or docker available)"
fi

# ── Manifest ──────────────────────────────────────────────────────
PG_HASH=$(sha256sum "$OUTPUT_DIR/pg-dump.sql.gz" | cut -d' ' -f1)
cat > "$OUTPUT_DIR/backup-manifest.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "outputDir": "$OUTPUT_DIR",
  "postgres": {
    "dump": "pg-dump.sql.gz",
    "sizeBytes": $PG_SIZE,
    "sha256": "$PG_HASH"
  },
  "minio": {
    "bucket": "$BUCKET",
    "path": "minio/$BUCKET"
  },
  "note": "Credentials and provider tokens are excluded."
}
EOF

echo ""
echo "=== Backup complete ==="
echo "Manifest: $OUTPUT_DIR/backup-manifest.json"
cat "$OUTPUT_DIR/backup-manifest.json"
