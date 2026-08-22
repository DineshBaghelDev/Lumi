# Library / Service Registry

This file is a concise implementation registry. Pin exact versions when dependencies are installed; do not hardcode speculative versions here.

| Tool | Purpose | Official reference |
|---|---|---|
| Next.js | Web app/router | https://nextjs.org/docs |
| Tailwind CSS | Styling | https://tailwindcss.com/docs |
| shadcn/ui | UI primitives | https://ui.shadcn.com/docs |
| TanStack Query | Server-state fetching/cache | https://tanstack.com/query/latest/docs/framework/react/overview |
| Fastify | API server | https://fastify.dev/docs/latest/ |
| Drizzle ORM | Typed SQL + migrations | https://orm.drizzle.team/docs/overview |
| Zod | Runtime contracts | https://zod.dev/ |
| Pino | Structured logging | https://getpino.io/ |
| LiteLLM | Multi-provider LLM gateway | https://docs.litellm.ai/ |
| codex-as-api | Primary development LLM provider behind LiteLLM; local health/completion service | local: http://127.0.0.1:18080 |
| OpenRouter | Fallback LLM provider behind LiteLLM | https://openrouter.ai/docs |
| SearXNG | Metasearch | https://docs.searxng.org/ |
| Crawl4AI | Crawling/Markdown extraction | https://docs.crawl4ai.com/ |
| Hugging Face TEI | Embedding HTTP service | https://huggingface.co/docs/text-embeddings-inference/ |
| BAAI/bge-small-en-v1.5 | Local embedding model | https://huggingface.co/BAAI/bge-small-en-v1.5 |
| pgvector | Vector storage/search | https://github.com/pgvector/pgvector |
| Mermaid | Diagrams | https://mermaid.js.org/ |
| Shiki | Code highlighting | https://shiki.style/ |
| react-markdown | Markdown rendering inside blocks | https://github.com/remarkjs/react-markdown |
| Playwright | E2E browser testing | https://playwright.dev/docs/intro |
| Turborepo | Monorepo task runner | https://turbo.build/repo/docs |
| pnpm | Package/workspace manager | https://pnpm.io/ |

## Usage rule

Consult official docs before using APIs that are version-sensitive. Add project-specific usage notes here only when they reduce repeated agent mistakes.
