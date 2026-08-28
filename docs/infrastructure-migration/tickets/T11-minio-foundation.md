# T11 — MinIO foundation

Dependencies: T10. Read: config boundaries, Compose, MinIO client docs.

Write scope: Compose, `services/minio/**`, storage package/config/tests,
manifests, lockfile, `.env.example`, this ticket, status matrix.

Add pinned MinIO/mc, persistent volume, official health endpoint, idempotent
private `lumi-assets` bucket setup, and separate API-reader/worker-writer
credentials. Expose no credentials to browsers.

Acceptance: private anonymous request fails; writer put/stat and reader get pass;
reader write fails. Commit: `feat(storage): add private minio service`.

Handoff: state=ready; commit=—; checks=—; risks=—.
