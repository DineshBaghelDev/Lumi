# T03 — Provider-neutral database config

Dependencies: T02. Read: config/db packages and all config callers.

Write scope: `packages/config/**`, `packages/db/**`, DB integration-test env
references, `.env.example`, lockfile if needed, this ticket, status matrix.

Replace InsForge DB configuration/factories with role-specific PostgreSQL URLs;
rename live test input to `TEST_DATABASE_URL`. Preserve Drizzle schema, pool
lifecycle, jobs, and retrieval. Remove the InsForge dependency from `@lumi/db`.

Acceptance: config/db tests, typecheck, build, workspace graph, and migration
config pass. Commit: `refactor(db): use local postgres contracts`.

Handoff: state=ready; commit=—; checks=—; risks=—.
