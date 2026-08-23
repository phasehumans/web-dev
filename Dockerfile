# -------------------------------------------------------------
# Base layer with Bun and OS dependencies
# -------------------------------------------------------------
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Install native prerequisites (openssl for Prisma, git, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy root monorepo manifests
COPY package.json bun.lock turbo.json ./

# Copy all workspace package manifests to match bun.lock
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

# Install workspace dependencies matching bun.lock
RUN bun install --frozen-lockfile

# Copy backend workspaces source code
COPY apps/server ./apps/server
COPY apps/worker ./apps/worker
COPY packages/agent ./packages/agent
COPY packages/database ./packages/database
COPY packages/providers ./packages/providers
COPY packages/shared ./packages/shared
COPY packages/tools ./packages/tools
COPY tsconfig.base.json tsconfig.json ./

# Generate Prisma Client for PostgreSQL
RUN bun --cwd packages/database db:generate

# -------------------------------------------------------------
# Production Server Target (@december/server)
# -------------------------------------------------------------
FROM base AS server
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1
CMD ["bun", "--cwd", "apps/server", "src/server.ts"]

# -------------------------------------------------------------
# Production Worker Target (@december/worker)
# -------------------------------------------------------------
FROM base AS worker
ENV NODE_ENV=production
CMD ["bun", "--cwd", "apps/worker", "src/index.ts"]
