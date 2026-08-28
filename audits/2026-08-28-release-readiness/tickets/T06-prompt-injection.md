# T06 — Quarantine untrusted research in LLM prompts

## Problem
Prompt-injection detection is recorded but flagged chunks still reach the chat system prompt as raw instructions.

## Scope
Write only `apps/worker/src/research.ts`, `apps/api/src/app.ts`, and focused tests. Keep changes narrowly limited to trust labeling/quarantine and prompt construction.

## Acceptance
- Injection-flagged content is excluded or clearly quarantined from instruction-bearing context.
- Retrieved research is delimited as untrusted data and cannot redefine assistant policy.
- Chat remains source-grounded and does not fall back to unsupported general-knowledge answers.
- Citation IDs remain tied to retrieved chunks.
