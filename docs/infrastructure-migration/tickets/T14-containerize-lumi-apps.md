# T14 — Containerize Lumi apps

Dependencies: T13. Read: build graph, app entrypoints, complete Compose.

Write scope: root Dockerfile/.dockerignore, Compose, Next build config, app
startup health/shutdown code/tests, this ticket, status matrix.

Use one multi-stage Dockerfile with web/API/worker targets and non-root runtime
users. Add internal URLs, health checks, graceful shutdown, and dependency
health gates. Bind published ports to localhost only.

Acceptance: config, builds, clean startup, health, restart persistence, and
graceful stop pass. Commit: `feat(infra): run lumi apps in compose`.

Handoff: state=ready; commit=—; checks=—; risks=—.
