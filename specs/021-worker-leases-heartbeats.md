# 021 — Worker leases, heartbeat, stale reclamation

## Goal

Implement one bounded V1 slice: **worker leases, heartbeat, stale reclamation**.

## Depends on

- `020-worker-polling.md`

## Requirements

- Heartbeat running jobs every 30 seconds by updating locked_at.
- Allow stale locks older than 5 minutes to be reclaimed safely.
- Use worker instance ID in locked_by.
- Stop heartbeat after terminal status.

## Acceptance criteria

- [ ] Healthy long job retains lease.
- [ ] Simulated crashed worker job becomes claimable after stale threshold.
- [ ] Two workers cannot both reclaim the same stale job.

## Required tests

- Time-controlled integration tests for heartbeat and stale lock recovery.

## Out of scope

- Retry classification.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
