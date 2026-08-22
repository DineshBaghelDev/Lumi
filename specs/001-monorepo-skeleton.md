# 001 — Monorepo skeleton

## Goal

Implement one bounded V1 slice: **monorepo skeleton**.

## Depends on

- None

## Requirements

- Initialize pnpm workspace and Turborepo root.
- Create `apps/web`, `apps/api`, `apps/worker`, `packages/db`, `packages/shared`, `packages/config`, `packages/llm`.
- Create `services/searxng`, `services/crawl4ai`, `services/litellm`, `services/embeddings` as config-only directories.
- Add root scripts for dev, build, test, lint/typecheck placeholders without product logic.

## Acceptance criteria

- [ ] `pnpm install` succeeds.
- [ ] `pnpm dev` can discover all three apps even if they only expose placeholders.
- [ ] No app imports source from another app.

## Required tests

- Workspace/package graph smoke test.
- Root typecheck/lint commands execute without missing-workspace errors.

## Out of scope

- No InsForge integration.
- No Docker services.
- No database schema.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
