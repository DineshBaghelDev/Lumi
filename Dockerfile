# ── Base ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile --prod=false

# ── Build shared packages ─────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/config ./packages/config
COPY packages/db ./packages/db
COPY packages/llm ./packages/llm
COPY packages/shared ./packages/shared
COPY packages/storage ./packages/storage
COPY packages/auth ./packages/auth
RUN pnpm --filter @lumi/config build && \
    pnpm --filter @lumi/shared build && \
    pnpm --filter @lumi/auth build && \
    pnpm --filter @lumi/storage build && \
    pnpm --filter @lumi/db build && \
    pnpm --filter @lumi/llm build

# ── Build API ─────────────────────────────────────────────────────────
FROM build-shared AS build-api
COPY apps/api ./apps/api
RUN pnpm --filter @lumi/api build

# ── Build web ─────────────────────────────────────────────────────────
FROM build-shared AS build-web
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @lumi/web build

# ── Runtime base ──────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile --prod=true
RUN addgroup -S lumi && adduser -S lumi -G lumi

# ── API target ────────────────────────────────────────────────────────
FROM runtime AS api
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/packages/*/dist ./packages/*/dist
USER lumi
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3001/health || exit 1
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]

# ── Worker target ─────────────────────────────────────────────────────
FROM runtime AS worker
COPY --from=build-shared /app/packages/*/dist ./packages/*/dist
COPY apps/worker/src ./apps/worker/src
USER lumi
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD pgrep -f "apps/worker" || exit 1
CMD ["node", "--import", "tsx", "apps/worker/src/index.ts"]

# ── Web target ────────────────────────────────────────────────────────
FROM runtime AS web
COPY --from=build-web /app/apps/web/.next ./apps/web/.next
COPY --from=build-web /app/apps/web/next.config.ts ./apps/web/
COPY apps/web/public ./apps/web/public
USER lumi
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", "apps/web/node_modules/.bin/next", "start"]
