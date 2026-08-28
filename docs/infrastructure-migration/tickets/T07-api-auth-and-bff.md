# T07 — API auth and BFF

Dependencies: T06. Read: Fastify auth and fixed-origin Next proxy.

Write scope: API auth/bootstrap/tests, web API/proxy helpers/tests, manifests,
this ticket, status matrix.

Resolve Better Auth cookie or bearer sessions, preserve `request.user` and
application-user synchronization, and forward only auth credentials to the
fixed API origin. Retain timeout, SSRF, response-size, and SSE protections.

Acceptance: missing/invalid cookie and bearer return 401; valid sessions map to
the same app user; proxy security regression tests pass. Commit:
`feat(api): authenticate better auth sessions`.

Handoff: state=done; commit=this ticket commit; checks=API/web tests,
typechecks, builds; risks=live cookie/bearer resolution requires Compose.
