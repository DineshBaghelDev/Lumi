# T04 — Replace generic research scaffolding with topic-specific discovery

## Problem
Non-Redis topics receive three generic concepts and shallow single-source coverage.

## Scope
Write only `apps/worker/src/research.ts`, `apps/worker/src/research.test.ts`, and research-client tests if strictly required. Preserve security changes owned by T05/T06.

## Acceptance
- General topics use the configured search/LLM research path to discover concepts specific to the requested topic, with evidence-backed coverage and meaningful source diversity.
- Redis behavior remains compatible.
- Budget limits and idempotent persistence remain respected.
- Tests prove generic placeholder concepts are not the fallback for ordinary topics and that source/concept mappings are bounded and deterministic.
