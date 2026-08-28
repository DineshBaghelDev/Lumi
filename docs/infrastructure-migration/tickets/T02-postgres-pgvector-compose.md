# T02 — PostgreSQL and pgvector Compose

Dependencies: T01. Read: spec 088, current Compose, T01 manifest contract.

Write scope: `compose.yaml`, `services/postgres/**`, `.env.example`, this ticket,
status matrix.

Add PostgreSQL 16 with pgvector 0.7.4 parity, immutable image identity, named
volume, localhost port, health check, and idempotent role/database bootstrap.
Passwords come only from environment. Keep LiteLLM on `litellm-db`.

Acceptance: `docker compose config --quiet`; clean-volume pgvector/version and
role probes pass; existing services remain valid. Commit:
`feat(infra): add local postgres pgvector`.

Handoff: state=ready; commit=—; checks=—; risks=—.
