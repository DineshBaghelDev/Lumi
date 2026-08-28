# Audit: August 28, 2026 — Release Readiness

## Executive Summary

**Lumi V1 is functionally complete.** All 87 specs are delivered. The generation pipeline (research → curriculum → lessons → assessments → projects) works end-to-end. RAG chat, notes/bookmarks, progress tracking, and retry/cancel UX are all operational.

**However, 3 critical blockers and 5 high-severity issues prevent production deployment.**

## Critical Blockers (Must Fix)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | MinIO image has broken SHA256 placeholder | `compose.yaml` | **Stack won't start** |
| 2 | MinIO bucket set to anonymous download | `compose.yaml` (mc service) | **All assets publicly accessible** |
| 3 | Hardcoded Redis concept fallback | `apps/worker/src/research.ts:28-48` | **Debug code in production** |

## High-Severity Issues (Fix Before Release)

| # | Issue | Impact |
|---|-------|--------|
| 4 | No rate limiting on chat endpoint | LLM cost exhaustion via abuse |
| 5 | Chat persistence failure silently ignored | Silent data loss |
| 6 | Worker service check has no max wait | Worker hangs forever |
| 7 | Chat stream error doesn't reset UI state | UI freezes after error |
| 8 | No cancellation propagation to running jobs | Resources consumed after cancel |

## What Works Well

- ✅ Full generation pipeline (research → curriculum → lessons → assessments → projects)
- ✅ RAG chat with pgvector retrieval and SSE streaming
- ✅ 30 tables with RLS, worker BYPASSRLS, role-based access
- ✅ Idempotent course creation with rate limiting
- ✅ Exponential backoff retry with 5 worker concurrency slots
- ✅ Zod validation at all boundaries
- ✅ SSRF/private-network guards on research crawling
- ✅ Docker Compose with health checks on all services
- ✅ 80+ tests across API, worker, shared, db, web packages

## Test Coverage

| Area | Coverage | Notes |
|------|----------|-------|
| Worker pipeline | ✅ Good | 44+ tests covering all 5 job types |
| API foundation | ⚠️ Moderate | 9 basic tests, 36 milestone7 tests |
| API routes | ❌ Missing | No route-level tests for most endpoints |
| E2E | ⚠️ Mocked | 9 Playwright specs, not live-verified |
| RLS | ✅ Good | Integration test + schema verification |
| Shared contracts | ✅ Good | Zod schema validation tests |

## Verdict

**Fix the 3 critical blockers + 5 high-severity issues, then proceed to limited beta.** The medium/low issues can be addressed in subsequent iterations.

Full report: [full-audit.md](./full-audit.md)
