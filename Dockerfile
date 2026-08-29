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

# ── Build worker ─────────────────────────────────────────────────────
FROM build-shared AS build-worker
COPY apps/worker ./apps/worker
RUN pnpm --filter @lumi/worker build

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
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/llm/package.json ./packages/llm/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile --prod=true
RUN addgroup -S lumi && adduser -S lumi -G lumi

# ── API target ────────────────────────────────────────────────────────
FROM runtime AS api
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/packages/auth/dist ./packages/auth/dist
COPY --from=build-api /app/packages/config/dist ./packages/config/dist
COPY --from=build-api /app/packages/db/dist ./packages/db/dist
COPY --from=build-api /app/packages/llm/dist ./packages/llm/dist
COPY --from=build-api /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-api /app/packages/storage/dist ./packages/storage/dist
USER lumi
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3001/health || exit 1
CMD ["node", "apps/api/dist/index.js"]

# ── Worker target ─────────────────────────────────────────────────────
FROM runtime AS worker
COPY --from=build-shared /app/packages/config/dist ./packages/config/dist
COPY --from=build-shared /app/packages/db/dist ./packages/db/dist
COPY --from=build-shared /app/packages/llm/dist ./packages/llm/dist
COPY --from=build-shared /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-shared /app/packages/storage/dist ./packages/storage/dist
COPY --from=build-worker /app/apps/worker/dist ./apps/worker/dist
USER lumi
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD pgrep -f "apps/worker" || exit 1
CMD ["node", "apps/worker/dist/index.js"]

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
