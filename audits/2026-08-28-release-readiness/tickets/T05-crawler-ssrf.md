# T05 — Bind research URL validation to crawler fetches

## Problem
Initial URL validation is separate from the Crawl4AI request, leaving redirect and DNS-rebinding gaps.

## Scope
Write only `apps/worker/src/research.ts`, `apps/worker/src/research-clients.ts`, and focused tests for URL/crawler behavior. Coordinate conceptually with T04; keep edits security-only.

## Acceptance
- Validate scheme/host/IP before opening a connection and revalidate final/redirect targets.
- Prevent private, loopback, link-local, metadata, and invalid addresses.
- Bound redirects, response/resource size, and request time.
- Tests cover redirects and rebinding-like address changes without requiring external services.
