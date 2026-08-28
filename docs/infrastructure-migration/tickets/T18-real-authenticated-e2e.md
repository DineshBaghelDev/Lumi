# T18 — Real authenticated E2E

Dependencies: T17. Read: release journey and deterministic generation fixtures.

Write scope: web E2E, deterministic provider fixtures/services, test Compose
overlay, this ticket, status matrix.

Authenticate with local password against real Better Auth/API/DB/worker/MinIO.
Cover generation, stored image, lesson/resume, assessment, project, chat,
citations, notes/bookmarks, reload, retry, cancellation, sign-out, and cross-user
denial. Keep Google/live-provider smoke non-blocking and separately reported.

Acceptance: deterministic full journey passes against Compose with real state
assertions. Commit: `test(e2e): verify local authenticated journey`.

Handoff: state=ready; commit=—; checks=—; risks=—.
