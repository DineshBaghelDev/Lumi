# T01 — Baseline export and reconciliation

Dependencies: none. Read: spec 088, migration README/runbook, DB schema.

Write scope: `scripts/migration/**`, `.gitignore`, this ticket, status matrix.

Implement a read-only 30-table allowlist exporter producing ignored compressed
JSONL plus a manifest of counts, stable hashes, FKs, job/course states, vector
dimensions/models, and auth mapping counts. Export safe identity/provider IDs
only; exclude passwords, sessions, tokens, and secrets. Abort on running jobs,
duplicate/missing identity keys, FK orphans, or non-384 vectors.

Acceptance: current InsForge can be inventoried without writes or secret output;
fixture export/reconciliation tests pass. Verify with package tests/typecheck and
a read-only dry run. Commit: `feat(migration): add safe baseline exporter`.

Handoff: state=done; commit=this ticket commit; checks=exporter unit tests,
workspace check, read-only live dry run; risks=source state must be re-exported at
cutover.
