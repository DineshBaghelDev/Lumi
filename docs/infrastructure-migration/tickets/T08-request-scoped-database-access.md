# T08 — Request-scoped database access

Dependencies: T07. Read: every API DB caller and streaming chat flow.

Write scope: DB ownership migration/helpers/tests, API DB access/tests, this
ticket, status matrix.

Add nullable `courses.owner_user_id`, populate new courses and backfill from
owner enrollments. Route authenticated work through short transactions using
`SET LOCAL lumi.user_id`; never retain identity on pooled connections. Keep
streaming DB phases short.

Acceptance: ownership backfill and pooled-connection leakage tests pass; all API
tests retain behavior. Commit: `refactor(api): scope database access per user`.

Handoff: state=ready; commit=—; checks=—; risks=—.
