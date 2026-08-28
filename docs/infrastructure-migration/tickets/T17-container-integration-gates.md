# T17 — Container integration gates

Dependencies: T16. Read: every service health contract and existing tests.

Write scope: integration tests/scripts, test Compose overlay, CI docs/config if
present, this ticket, status matrix.

Gate clean migrations, Better Auth, RLS, worker claims, pgvector retrieval,
MinIO access/delivery, restarts, workspace checks, builds, and health-gated
startup against disposable volumes.

Acceptance: every gate is runnable by one documented command and leaves working
volumes untouched. Commit: `test(infra): add local stack integration gates`.

Handoff: state=ready; commit=—; checks=—; risks=—.
