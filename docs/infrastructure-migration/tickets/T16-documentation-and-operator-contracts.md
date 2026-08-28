# T16 — Documentation and operator contracts

Dependencies: T15. Read: all architecture/decision/setup docs and tracker.

Write scope: `README.md`, `docs/**`, `context/**`, specs index, `.env.example`,
this ticket, status matrix.

Document the delivered local topology, data/auth/storage models, Google callback,
local password limitation, polling, startup/shutdown, logs, health, secret
rotation, backup/restore, and migration history. Remove stale active claims.

Acceptance: docs agree with code/Compose and contain no secrets or unsupported
production claim. Commit: `docs: document local infrastructure operations`.

Handoff: state=ready; commit=—; checks=—; risks=—.
