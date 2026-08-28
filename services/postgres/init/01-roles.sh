#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 \
  --set=auth_password="$LUMI_AUTH_DB_PASSWORD" \
  --set=api_password="$LUMI_API_DB_PASSWORD" \
  --set=worker_password="$LUMI_WORKER_DB_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;

SELECT format('CREATE ROLE lumi_auth LOGIN PASSWORD %L', :'auth_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lumi_auth')\gexec
SELECT format('CREATE ROLE lumi_api LOGIN PASSWORD %L', :'api_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lumi_api')\gexec
SELECT format('CREATE ROLE lumi_worker LOGIN BYPASSRLS PASSWORD %L', :'worker_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lumi_worker')\gexec

ALTER ROLE lumi_auth PASSWORD :'auth_password';
ALTER ROLE lumi_api NOBYPASSRLS PASSWORD :'api_password';
ALTER ROLE lumi_worker BYPASSRLS PASSWORD :'worker_password';

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE lumi TO lumi_auth, lumi_api, lumi_worker;
SQL
