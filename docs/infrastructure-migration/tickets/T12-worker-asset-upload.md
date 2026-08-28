# T12 — Worker asset upload

Dependencies: T11. Read: research URL guards, image discovery, assets schema.

Write scope: worker research/storage code/tests and storage helpers, this ticket,
status matrix.

Reuse SSRF/redirect guards to download approved images; enforce size and
PNG/JPEG/GIF/WebP signatures; reject SVG. Upload by SHA-256 course-scoped key,
then persist the row. Retries reuse the object. Add orphan reporting, not a
distributed transaction.

Acceptance: valid upload, spoofed MIME, oversized body, SVG, retry, DB failure,
and orphan-report tests pass. Commit: `feat(worker): persist research assets`.

Handoff: state=ready; commit=—; checks=—; risks=—.
