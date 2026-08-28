# T04 — Better Auth schema and runtime

Dependencies: T03. Read: spec 088, current auth, Better Auth 1.6.23 docs.

Write scope: `packages/auth/**`, workspace config, DB auth schema/migration,
lockfile, `.env.example`, this ticket, status matrix.

Add shared Better Auth with Drizzle PostgreSQL adapter, prefixed auth tables,
Google, bearer plugin, trusted origins, seven-day sessions/one-day updates,
secure cookie rules, 12-character passwords, and a production guard against
unverified email mode. Runtime schema mutation is forbidden.

Acceptance: schema is migration-owned; auth config/session tests and package
checks pass. Commit: `feat(auth): add better auth runtime`.

Handoff: state=done; commit=this ticket commit; checks=auth/config/DB tests,
typecheck, build, reviewed Drizzle migration; risks=live auth requires local
PostgreSQL and real Google credentials.
