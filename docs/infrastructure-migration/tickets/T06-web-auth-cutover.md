# T06 — Web auth cutover

Dependencies: T05. Read: current web auth/proxy/routes/sign-in UI.

Write scope: web auth helpers/routes/actions/UI/tests, web manifest, this ticket,
status matrix.

Replace InsForge SSR auth with Better Auth. Keep `/api/auth/start` as the Google
entry point, use the canonical Better Auth handler/callback, add local
signup/sign-in and authenticated set/change password, validate protected routes,
sign out, and clear stale InsForge cookies.

Acceptance: anonymous/protected redirects, password and Google initiation,
session restore/update, stale-cookie cleanup, and sign-out tests pass. Commit:
`feat(web): migrate sessions to better auth`.

Handoff: state=ready; commit=—; checks=—; risks=—.
