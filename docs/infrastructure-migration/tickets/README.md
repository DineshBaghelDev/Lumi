# Ticket index

Run sequentially. Every ticket is one commit and updates the status table in
`../README.md`.

1. T01 baseline export and reconciliation
2. T02 PostgreSQL/pgvector Compose
3. T03 provider-neutral database config
4. T04 Better Auth schema and runtime
5. T05 legacy identity import
6. T06 web auth cutover
7. T07 API auth and BFF
8. T08 request-scoped database access
9. T09 application data import rehearsal
10. T10 RLS roles and policies
11. T11 MinIO foundation
12. T12 worker asset upload
13. T13 authenticated asset delivery
14. T14 containerize Lumi apps
15. T15 remove InsForge
16. T16 documentation and operator contracts
17. T17 container integration gates
18. T18 real authenticated E2E
19. T19 backup, restore, and cutover

Ticket completion response: changed files; verification commands and results;
commit SHA; external/unverified risk. Stop on destructive data changes,
credentials, conflicting specs, or a failed focused repair.
