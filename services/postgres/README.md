# Local PostgreSQL

Compose runs PostgreSQL 16 with pgvector 0.7.4, matching the source extension
version for cutover. `lumi_migrator` owns local migrations. The init script
creates separate auth, API, and worker login roles from environment-provided
passwords; it is safe to rerun, but Docker invokes it automatically only for an
empty volume.

Never point this bootstrap or Drizzle migrations at InsForge. Do not remove the
`lumi-db-data` volume except during an explicitly approved clean rehearsal.
