# ADR 0005: E2B Cloud MicroVM Sandbox & Extended Agent Architecture

## Status

Accepted

## Context

December originally relied on a self-hosted Firecracker execution pipeline:

- `apps/runtime`: A Rust application managing local Firecracker microVMs over Linux `/dev/kvm` and `vsock`.
- `apps/sidecar`: A compiled Bun agent binary injected into a 10GB `ubuntu-rootfs.ext4` image.
- `packages/proto`: gRPC definitions for Node-to-Rust communication.

This architecture required expensive AWS Bare Metal (`.metal`) instances, complex Linux network bridge scripts (`scripts/network_sandbox.sh`), and heavy local disk assets (10GB+).

Furthermore, December requires four core Devin-like capabilities:

1. **Interactive Agent Workspaces**: Live HMR web preview (`<iframe>`) and real-time terminal streaming.
2. **PR Reviews**: Ephemeral code verification with static analysis and test execution before commenting.
3. **Repository Wiki Generation**: Deep codebase analysis generating structured markdown documentation.
4. **Security Audits & One-Click Remediation**: Automated vulnerability scanning (`gitleaks`, `npm audit`) with automated GitHub PR creation.

## Decision

We migrate December execution sandboxing entirely to **E2B Managed Cloud (`@e2b/sandbox`)**:

1. **E2B Cloud Execution Engine**:
    - `apps/worker` directly manages BullMQ jobs, E2B API calls (`@e2b/sandbox`), and MinIO storage.
    - Eliminates `apps/runtime` (Rust), `apps/sidecar`, `packages/proto`, `ubuntu-rootfs.ext4` (10GB), `vmlinux.bin`, and Firecracker shell scripts.

2. **State & MinIO Workspace Archiving**:
    - Workspace archives exported to MinIO exclude `node_modules` and build caches (`.next`, `dist`), keeping backup/restore duration under 1 second.

3. **Sandbox Lifecycle & Credit Protection**:
    - A WebSocket heartbeat listener in `apps/web` detects tab closure. After a 2-minute grace period, workspace state is archived to MinIO and `sandbox.kill()` is invoked.

4. **Live Web Preview Architecture**:
    - Ports exposed inside E2B (e.g., `5173`) are automatically mapped to public HTTPS URLs via `sandbox.getHost(port)` and rendered in `apps/web` inside an `<iframe>`.
    - Agent browser interaction uses `@e2b/desktop` / Playwright screencasting over WebSockets.

5. **PR Review Engine**:
    - Spins up an ephemeral E2B sandbox, clones the PR branch, runs typechecking (`tsc`) and linters/tests, and posts verified reviews to both December DB (`ReviewComment`) and GitHub PR API.

6. **Repository Wiki & Security Audit Engine**:
    - **Wiki**: Clones target repos into E2B sandboxes to execute deep AST/filesystem searches (`grep_search`, `tree`) and populates `RepositoryWiki` & `WikiPage` records in Postgres.
    - **Security Audits**: Runs CLI security scanners (`gitleaks`, `npm audit`) alongside AI analysis inside an E2B sandbox to generate vulnerability reports.
    - **One-Click Remediation**: Clicking "Fix with December" spawns an E2B agent session to apply fixes, run unit tests, and create a GitHub Pull Request automatically.

## Consequences

- **Cost**: Reduces monthly cloud server costs from $300–$500/mo (AWS `.metal`) to **$0/mo** by leveraging E2B's $100/mo free tier on standard cheap VPS or Vercel/Render hosting.
- **Repository Size**: Removes ~10GB of binary rootfs and kernel assets from disk.
- **DevOps Maintenance**: Eliminates Linux KVM kernel driver management, TAP networking, and gRPC wrapper maintenance.
- **Product Velocity**: Enables Devin-equivalent features (Live Preview, PR Reviews, Wiki Generation, Security Audits) out of the box.
