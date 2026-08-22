# 087 — Final V1 polish and release checklist

## Goal

Implement one bounded V1 slice: **final v1 polish and release checklist**.

## Depends on

- `081-api-integration-tests.md`
- `082-worker-pipeline-tests.md`
- `083-asset-tests.md`
- `084-rag-chat-tests.md`
- `085-playwright-happy-path.md`
- `086-failure-retry-ux.md`

## Requirements

- Review all V1 screens against design system for hierarchy, spacing, light theme, responsive behavior, accessibility, and loading/empty/error states.
- Run typecheck, lint, unit, API integration, worker pipeline, asset/RAG, and Playwright suites.
- Remove dead code/placeholders and verify docs/context/progress reflect implementation.
- Exercise the Redis-topic golden fixture from course creation through usable learning experience.

## Acceptance criteria

- [ ] All V1 acceptance tests pass.
- [ ] No V2-only feature accidentally ships.
- [ ] Context/progress/build-plan are updated to final V1 state.
- [ ] Known limitations are documented explicitly.

## Required tests

- Full repository verification commands documented and passing.

## Out of scope

- Deployment/hosting optimization.
- V1.1 email auth.
- V2 diagnostics/caching/reranking/IDE.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
