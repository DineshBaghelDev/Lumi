# T13 — Authenticated asset delivery

Dependencies: T12. Read: lesson DTO/rendering and BFF response limits.

Write scope: API asset route/tests, web proxy/lesson rendering/tests, shared DTO
if needed, this ticket, status matrix.

Resolve an asset ID after course-access checks, stat and stream bounded MinIO
bytes with safe headers, return an authenticated content URL, and proxy image
streams without turning them into text. Never accept an arbitrary object key.

Acceptance: render succeeds; cross-user, missing, MIME mismatch, oversized
object, and MinIO outage fail safely. Commit:
`feat(assets): deliver private lesson images`.

Handoff: state=ready; commit=—; checks=—; risks=—.
