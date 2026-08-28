# T09 — Improve worker throughput and reconcile release documentation

## Problem
One worker process claims/awaits one job despite configured concurrency, and README/architecture/tracker claim behavior the implementation does not provide.

## Scope
Write only `apps/worker/src/index.ts`, `apps/worker/src/worker.ts` if required for concurrency plumbing, `README.md`, `context/progress-tracker.md`, `docs/DECISIONS.md`, and directly stale architecture docs. Do not change product behavior outside concurrency/documentation.

## Acceptance
- Configured worker concurrency is actually used with bounded job ownership and graceful shutdown.
- Existing per-course/global limits remain enforced.
- README/tracker/architecture state the effective implementation and known release blockers honestly.
- Relevant worker tests/typecheck pass.
