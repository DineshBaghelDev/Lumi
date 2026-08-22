# Code Standards

## TypeScript

- Strict mode enabled.
- Prefer explicit domain types and Zod-inferred contracts.
- Avoid `any`; document unavoidable boundary escapes.
- Prefer small pure functions for transformation/validation logic.
- Use async/await consistently.

## Naming

- files: kebab-case unless framework convention requires otherwise
- variables/functions: camelCase
- types/components: PascalCase
- database columns: snake_case
- environment variables: SCREAMING_SNAKE_CASE

## Boundaries

- Route handlers validate input, authorize, call application logic, serialize output.
- Worker handlers orchestrate; reusable transformation logic belongs in packages/modules.
- DB schema/migrations only in `packages/db`.
- Shared Zod/API/domain contracts only in `packages/shared`.
- LLM access only through `packages/llm`.

## Database

- Use transactions for multi-row invariants.
- Prefer normalized relations over arrays for entity relationships.
- All retryable job writes must be idempotent.
- Explicit indexes for foreign keys and high-frequency filters.
- Never store large crawled/raw binary content directly in Postgres when Storage is appropriate.

## API

- Consistent error envelope.
- Zod validation for request and response boundaries.
- Authenticated routes validate InsForge JWT and enforce access server-side.
- Mutation endpoints should be idempotent where network retries are plausible.

## Frontend

- Use server state through TanStack Query.
- Keep local UI state local; avoid a global store without a concrete need.
- Use design-system primitives before bespoke styling.
- Business rules remain outside visual components.
- Every async surface must define loading, empty, error, and retry states.

## Tests

- Unit tests colocated with source.
- API integration: `apps/api/tests/`.
- Worker integration/pipeline: `apps/worker/tests/`.
- Playwright E2E: `apps/web/e2e/`.

## Change discipline

- Minimal coherent diffs.
- No speculative abstractions.
- No dead compatibility layers for features that have never shipped.
- Update specs/context when behavior or contracts intentionally change.

## Security and bounded work

- Treat all crawled/source content as untrusted data.
- Outbound research/resource fetches must pass the centralized URL/SSRF guard; never implement ad-hoc fetch bypasses.
- Never interpolate crawled text into system/developer instruction roles.
- Sanitize source-derived content before rendering; do not render arbitrary remote assets directly.
- Every expensive generation/research operation must use the centralized course budget/cancellation checks.
- Job uniqueness and lifecycle invariants belong in the database/shared job service, not handler-specific conventions.
