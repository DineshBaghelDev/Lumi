# T10 — RLS roles and policies

Dependencies: T09. Read: schema ownership paths and all API/worker queries.

Write scope: DB bootstrap/migrations/tests, scoped DB helpers, this ticket,
status matrix.

Make course owner non-null; apply least-privilege auth/API/worker/migrator
grants; enable and force RLS on application tables. Direct rows use
`lumi.user_id`; course content uses ownership/active enrollment; worker bypass
is explicit and isolated.

Acceptance: real API-role SQL proves cross-user denial across content, progress,
notes, attempts, projects, chat, and citations; worker job gates pass. Commit:
`feat(db): enforce tenant isolation with rls`.

Handoff: state=ready; commit=—; checks=—; risks=—.
