# December Monorepo Task Runner (Just)

# List all available recipes
default:
    @just --list

# Start development servers (excluding CLI and TUI)
dev:
    bun run dev

# Run CLI in watch mode
dev-cli:
    bun run dev:cli

# Run full linting, typechecking, and test suite across workspaces
verify:
    bun run verify

# Run ESLint across all files
lint:
    bun run lint

# Fix ESLint issues automatically
lint-fix:
    bun run lint:fix

# Check dead code and unused dependencies via Knip
lint-knip:
    bun run lint:knip

# Run spell checking across codebase
lint-spelling:
    bun run lint:spelling

# Format codebase with Prettier
format:
    bun run format

# Run TypeScript typechecking across monorepo
typecheck:
    bun run typecheck

# Run unit and integration test suite
test:
    bun run test

# Run tests for specific packages
test-agent:
    bun run test:agent

test-providers:
    bun run test:providers

test-tools:
    bun run test:tools

test-shared:
    bun run test:shared

test-cli:
    bun run test:cli

# Build all packages and apps
build:
    bun run build

# Run database migrations for test environment
db-migrate-test:
    bun db:migrate:test

# Run database migrations for development environment
db-migrate-dev:
    bun db:migrate:dev

# Open Prisma Studio
db-studio:
    bun db:studio

# Start preview Docker container
container-start:
    bash scripts/container.sh start

# Stop preview Docker container
container-stop:
    bash scripts/container.sh stop

# Clean build artifacts and Turbo cache
clean:
    bun run clean
