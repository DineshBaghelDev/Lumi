# T01 — Lock down the web API proxy

## Problem
`apps/web/src/app/api/proxy/[...path]/route.ts` lets path text override the configured API origin and forwards a session bearer token. Add timeout and bounded response handling.

## Scope
Write only `apps/web/src/app/api/proxy/[...path]/route.ts` and a focused adjacent test if needed.

## Acceptance
- Only a relative path under the configured API origin is accepted.
- Absolute, scheme-relative, malformed, and traversal-like inputs cannot select another host.
- Authorization is forwarded only to the configured API origin.
- Upstream fetch has an abort timeout and bounded response size.
- Add tests for hostile URL forms and the happy path; run the focused web test/typecheck.
