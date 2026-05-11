# Production image for Next.js (standalone output). Render-first per README.
# Build: docker build -t ttb-label-verifier:local .
# Run:   docker run --rm -p 3000:3000 -e OPENAI_API_KEY=... ttb-label-verifier:local

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
# Reduce flaky `ECONNRESET` / npm crashes during large registry fetches in CI/Docker.
# Also limit install parallelism to avoid multiple concurrent registry downloads.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_jobs=1 \
    npm_config_maxsockets=1 \
    npm_config_audit=false \
    npm_config_fund=false
# No BuildKit `RUN --mount=type=cache` here: Render's Metal builder rejects generic
# cache `id=` values (requires a platform cacheKey prefix tied to the service). Layer
# cache still speeds rebuilds when package manifests are unchanged.
RUN npm ci --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
