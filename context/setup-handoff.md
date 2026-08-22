# Setup Handoff

## Phase 2 status

Environment and prerequisite setup is complete. Product implementation has not started; begin Phase 3 with `specs/001-monorepo-skeleton.md` only after explicit authorization.

## Verified local tools

- Node.js: `v26.5.1`
- npm: `11.17.0`
- Corepack: `0.35.0`
- pnpm: `11.22.0`
- Git: `2.47.1.windows.1`
- GitHub CLI: `2.96.0`, authenticated as `DineshBaghelDev`
- Docker: CLI `28.5.1`, Compose `v2.40.3-desktop.1`; Docker Desktop engine verified with `hello-world`
- Context7: available via `npx ctx7@latest`
- InsForge CLI: available via `npx -y @insforge/cli`

## InsForge

- Project: `Lumi`
- Project ID: `8a1f46e0-3c80-4852-86f2-796a27784616`
- Organization ID: `7160435e-0194-4b19-93f2-03a525e7846e`
- Region: `ap-southeast`
- API base: `https://44defjje.ap-southeast.insforge.app`
- Status: active
- Instance: `nano`
- Database smoke check: `select 1 as ok` succeeded
- Storage buckets: none yet
- Secrets stay local in `.env` and InsForge-managed secret storage; do not commit them

## Google OAuth

- Google provider is configured in InsForge with the project-specific Google client.
- InsForge-generated Google auth URL was verified and redirects to `accounts.google.com`.
- Google callback URI in use: `https://44defjje.ap-southeast.insforge.app/api/auth/oauth/google/callback`
- Allowed app redirects currently configured:
  - `http://localhost:3000/`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/courses`
- Add the deployed app URL to allowed redirects when deployment exists.

## LLM routing

- LiteLLM remains the application boundary for generation calls.
- Primary development provider: codex-as-api
- codex-as-api base: `http://127.0.0.1:18080`
- Completion endpoint: `/v1/chat/completions`
- Current model: `gpt-5.5`
- Requests require a system message.
- Smoke test with a system message returned `OK`.
- Fallback provider: OpenRouter
- OpenRouter key was verified as valid.
- The owning LiteLLM spec implements routing; do not bypass `packages/llm`.

## Embeddings

- Hugging Face TEI serving `BAAI/bge-small-en-v1.5` is authoritative.
- Embedding dimension: 384
- Any LM Studio embedding reference is stale.

## Review

- CodeRabbit is intentionally skipped for this MVP environment.
- Independent reviewer subagents remain mandatory for meaningful changes.

## Runtime reminders

- Keep Docker Desktop available before Docker service specs.
- Keep codex-as-api running for live LLM-backed development.
- Use OpenRouter only as fallback through LiteLLM.
