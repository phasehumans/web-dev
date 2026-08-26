FROM oven/bun:1.3.14 AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @december/server @december/worker --docker

FROM oven/bun:1.3.14 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    git \
    curl \
    ca-certificates \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile --ignore-scripts

COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json tsconfig.json ./

RUN bun --cwd packages/database db:generate

FROM base AS server
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1
CMD ["bun", "--cwd", "apps/server", "src/server.ts"]

FROM base AS worker
ENV NODE_ENV=production
CMD ["bun", "--cwd", "apps/worker", "src/index.ts"]
