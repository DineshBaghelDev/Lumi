# T19 — Backup, restore, and cutover

Dependencies: T18. Read: runbook and all reconciliation/gate outputs.

Write scope: backup/restore scripts, redacted evidence/docs, this ticket, status
matrix. Dumps, credentials, and object bytes remain ignored.

Restore PostgreSQL/MinIO into separate project volumes, reconcile, freeze source
writes, require zero running jobs, take the final export, import, gate, and only
then enable local writes/worker. Preserve queued jobs. Record the first-write
rollback boundary and retain source export/tag for 14 days.

Acceptance: clean restore and all release gates pass; publish explicit GO/NO-GO.
Commit: `ops: rehearse local infrastructure cutover`.

Handoff: state=ready; commit=—; checks=—; risks=—.
