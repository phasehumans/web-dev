FROM oven/bun:1.3.14 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock turbo.json ./

COPY apps/server/package.json ./apps/server/
COPY apps/worker/package.json ./apps/worker/
COPY apps/cli/package.json ./apps/cli/
COPY apps/web/package.json ./apps/web/
COPY packages/agent/package.json ./packages/agent/
COPY packages/database/package.json ./packages/database/
COPY packages/evals/package.json ./packages/evals/
COPY packages/providers/package.json ./packages/providers/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tools/package.json ./packages/tools/
COPY packages/tui/package.json ./packages/tui/

RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/server ./apps/server
COPY apps/worker ./apps/worker
COPY packages/agent ./packages/agent
COPY packages/database ./packages/database
COPY packages/providers ./packages/providers
COPY packages/shared ./packages/shared
COPY packages/tools ./packages/tools
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
