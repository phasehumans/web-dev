# AGENTS.md

## Agent skills

### Issue tracker

Issues and PRDs for this repo live as GitHub issues (`phasehumans/december`). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses canonical triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

## Server Module Architecture & Service Standards

Reference gold standard modules: `auth`, `notification`, `session`.

- **File Responsibility Separation**:
    - `<module>.routes.ts`: Defines Express routes delegating to controller functions (`export default <module>Router`).
    - `<module>.controller.ts`: Handles HTTP requests using `asyncHandler`, parses validation schemas via Zod (`.parse()`), and returns `sendSuccess(res, message, data, status)` or throws `AppError(message, status)`. Exports `<module>Controller` object.
    - `<module>.service.ts`: Business logic functions. Exports `<module>Service` object.
    - `<module>.repository.ts`: Database / Prisma queries. Exports `<module>Repository` object.
    - `<module>.schema.ts`: Zod request validation schemas.
    - `<module>.types.ts`: Centralized TypeScript interfaces and types.
    - `<module>.utils.ts`: Module helper functions.

- **Service Layer Rules**:
    - **Arrow Functions**: All service functions must be declared as private `const functionName = async (data: TypeName) => { ... }` arrow functions.
    - **Single Parameter & Destructuring**: Service functions accept a single typed `data` object parameter and destructure its fields on the **first line** inside the function body (`const { prop1, prop2 } = data`).
    - **Type Centralization**: Service parameter types and interfaces must be defined in `<module>.types.ts` and imported into `<module>.service.ts`.
    - **Singleton Export**: Individual service functions must not be exported directly. Export exclusively via a single object at the end of the file (`export const <module>Service = { ... }`).

## Testing & Environment

- **Test Environment & DB Setup**: Tests run against `.env.test`.
- **Database Migrations for Tests**: Before running integration or server tests against the test database, deploy test migrations:
    ```bash
    bun --cwd packages/database db:migrate:test
    ```

## Code Quality & Linting Standards

- **No Empty Catch Blocks**: Never leave catch blocks empty (`catch (e) {}`). Always include a descriptive comment explaining why the error is ignored (e.g. `// Intentionally swallowed: fallback handled`), or log/handle the error.
- **No `require()` Imports**: Never use CommonJS `require()`. Always use top-level ES module `import` statements (`import ... from '...'`).
- **Scoped Switch Cases**: Always enclose `case` blocks in curly braces `{ ... }` when declaring `const` or `let` variables inside a `switch` statement.
- **Complete React Hook Dependencies**: Ensure all `useEffect`, `useCallback`, and `useMemo` hooks have complete dependency arrays or explicitly documented refs.

---

# December Codebase Architecture

## 1. Vision & Identity

**December** is a full-stack, agentic AI coding assistant designed to operate as a self-hosted or cloud-scalable alternative to Devin. It allows developers to interact with an autonomous AI software engineer either locally via a terminal UI (CLI) or through a collaborative cloud web interface.

The core philosophy of December is **"Write once, run anywhere."** The core AI reasoning loop (`packages/agent`) is entirely decoupled from the environment it runs in. It executes identically whether it's running locally on a user's MacBook (via CLI) or securely inside an ephemeral Firecracker microVM in the cloud (via the Sidecar).

---

## 2. Monorepo Structure: Apps & Packages

### Apps

- **`apps/cli`**: The local command-line application (built with Ink). It runs the agent loop locally on the user's machine, executing bash/file tools directly on the host OS.
- **`apps/server`**: The Node.js backend API. Manages users, authentication, projects (folders), sessions (workspaces), billing, WebSocket connections, and queues up Agent jobs.
- **`apps/worker`**: A background Node.js process (using BullMQ) that pulls jobs from Redis. Its primary job is to orchestrate cloud sessions, spin up VMs via the Runtime, and manage async event streams.
- **`apps/runtime`**: A Rust application running on bare-metal servers. It manages the lifecycle of Firecracker microVMs and acts as a secure `vsock` relay between the VM and the Worker.
- **`apps/web`**: The Cloud frontend (Vite + React) offering a Devin-like workstation experience (Chat, Terminal, Code editor, Browser preview).
- **`apps/sidecar`**: A lightweight wrapper built around `packages/agent`, compiled into a standalone Linux binary using `bun build --compile`. It gets injected directly into the Firecracker VM by the Worker, runs the AI reasoning loop natively inside the sandbox, and streams telemetry back out.

### Packages

- **`packages/agent`**: The core AI logic, holding the context manager, loop generator, and prompt handling. Agnostic to where it runs.
- **`packages/tools`**: Implementations of various tools (Bash, FS, Browser, MCP).
- **`packages/providers`**: Integrations with various LLMs (Anthropic, Gemini, OpenAI, DeepSeek, etc.).
- **`packages/shared`**: Shared TypeScript types, utility functions, and Event definitions used across all apps.
- **`packages/database`**: Prisma schema and clients.
- **`packages/tui`**: UI components for the local CLI.

---

## 3. Cloud Architecture: The Injected Sidecar Model

To achieve maximum speed, ultimate security, and horizontal scalability, December utilizes the **"Injected Sidecar" Model (True Sandbox)** for cloud deployment.

### How it works:

1. **The Binary Payload:** The AI Agent logic (`packages/agent`) is compiled into a standalone Linux binary (`apps/sidecar`). This keeps the Firecracker VM image completely generic (no Node/Bun pre-installation required).
2. **The Injection & Handshake:** `apps/worker` provisions the VM and pushes the Sidecar binary into it. When the Sidecar boots, it connects to a `vsock` endpoint. The Rust Runtime securely transmits the initial configuration (prompt, context, encrypted secrets) directly into the agent's memory. No secrets touch the disk.
3. **Zero Latency Execution:** Because the Agent lives on the same filesystem as the session workspace, it executes bash tools instantly. It spawns long-running background servers (`npm run dev`) and monitors them directly without gRPC network latency.
4. **The Communication Bridge (`vsock`):** The Sidecar streams its data out over Firecracker's Virtual Sockets (`vsock`). The Rust Runtime securely relays this `vsock` stream over gRPC to the Node Worker, keeping the VM 100% network-isolated from internal cloud infrastructure.
5. **Event-Driven Sync & Billing:** The Sidecar acts purely as a dumb event emitter. It streams structured JSON events (e.g., `{ type: "USAGE", tokens: 150 }`) over `vsock`. The Node Worker consumes these events, updates Postgres, deducts credits, and broadcasts to WebSockets. If credits hit zero, the Worker instantly sends a `KillVM` signal.

---

## 4. The "Project" Concept & Data Model Refactoring

In the refactored architecture, we completely separate workspace environments and persistent sessions from files and folders:

- **The Refactored "Project as a Folder" Model:** In the simplified design, a **Project** represents a simple, lightweight **Folder** or container. It strips away all integrations, configurations, and versioning features:
    - **Fields Stripped:** `isStarred`, `isFeatured`, `isSharedAsTemplate`, and the `ProjectCategory` enum.
    - **Fields Kept:** Basic folder metadata: `id`, `name`, `userId`, `description`, `createdAt`, and `updatedAt`.
    - **Wiki Documentation:** Documentation pages at the project level are represented by the `WikiPage` model, linked to the `projectId`.
- **Model Deletions and Renames:**
    - **Deleted Models:** `ProjectVersion`, `ProjectVersionStatus` enum, and `ProjectLike`.
    - **Renamed Models:** `ProjectMemory` ➔ `SessionMemory`, `ProjectImport` ➔ `SessionImport`, `ProjectCollaborator` ➔ `SessionCollaborator`.
    - **New Models:** `SessionSettings`, `ReviewComment`, `WikiPage`.
- **The "Session" as the Workspace Wrapper:** A **Session** is the primary workspace where an Agent's execution loop runs:
    - **Integrations Transferred:** GitHub configurations, Vercel deployments, and MinIO storage prefixes are attributes of the `Session` model.
    - **Standalone Sessions:** Nullable `projectId` allows independent sessions.
    - **Workspace State & Settings:** Sessions track runtime state (`vmStatus`: `PROVISIONING`, `RUNNING`, `STOPPED`, `FAILED`), configuration settings via `SessionSettings`, and reviews via `ReviewComment`.
- **The Wiki Feature (Documentation Management):** Organized at the Project (Folder) level via `WikiPage`. Equipped with `read_wiki` and `update_wiki` tools.
- **The Review Feature (PR & Feedback Loops):** Organized at the active `Session` level via `ReviewComment`. Backed by the December GitHub App and tools (`create_pr_review`, `submit_pr`).
