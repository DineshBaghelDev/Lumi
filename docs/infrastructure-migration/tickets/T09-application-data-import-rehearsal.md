# T09 — Application data import rehearsal

Dependencies: T08. Read: T01 archive and current migrations.

Write scope: `scripts/migration/**`, migration fixtures/tests, this ticket,
status matrix; generated archives remain ignored.

Import the exact table allowlist with explicit columns/order, derived course
owners, preserved IDs/timestamps/statuses/JSON/vectors, and no managed schemas
or foreign migration ledgers. Reconcile counts, hashes, FKs, owners, vector
metadata, and retrieval samples.

Acceptance: repeatable empty-database rehearsal matches the source manifest and
second import fails safely without duplication. Commit:
`feat(migration): rehearse application data import`.

Handoff: state=ready; commit=—; checks=—; risks=—.
