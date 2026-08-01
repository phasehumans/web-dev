# December CLI Git and GitHub Capabilities Audit

## Executive Summary

Based on an empirical audit of the December codebase, here are the answers to the requested capabilities:

1. **Can December CLI execute git commands?** **YES**. It does so via the `BashTool` (executing via `child_process.spawn` on the host).
2. **Can December CLI create PRs on behalf of the user?** **YES (via bash/API, but mocked via native tools)**. It can create PRs using the `gh` CLI in bash or via the `GitHubTool` REST wrapper. However, the dedicated `submit_pr` tool is currently mocked.
3. **Can December CLI create issues and mark issues done on behalf of the user?** **YES**. Guided by `issue-tracker.md`, it can use the `gh` CLI (via `bash`) or the `GitHubTool` REST wrapper to manage issues.
4. **Can December CLI commit on behalf of the user?** **YES**. It uses standard git CLI commands through the `BashTool`.
5. **Do we have complete end-to-end implementation for each of these?**
    - **Git Execution**: **YES** (E2E via `BashTool`).
    - **Git Commit**: **YES** (E2E via `BashTool`).
    - **PR Creation**: **NO** for dedicated tools (`submit_pr` is mocked), but **YES** conceptually via generic tools (`gh` in `BashTool` or `GitHubTool` REST API).
    - **Issue Creation/Resolution**: **NO** for dedicated tools (none exist), but **YES** conceptually via generic tools (`gh` in `BashTool` or `GitHubTool` REST API).

---

## Detailed Breakdown

### 1. Git Execution

**Capability:** YES
**How it works:**
The CLI provides a generic shell execution environment through the `BashTool` defined in [`packages/tools/src/bash.ts`](file:///home/chaitanya/code/december/packages/tools/src/bash.ts). This tool relies on the `bash.exec` operation provided by the runtime environment.
In the CLI context, this operation is bound to `localOperations.bash.exec` in [`apps/cli/src/local-operations.ts`](file:///home/chaitanya/code/december/apps/cli/src/local-operations.ts), which uses Node's native `child_process.spawn` with `shell: true`.
Because the CLI spawns a shell process directly in the user's workspace, any standard git command (`git status`, `git checkout`, `git clone`) will execute exactly as it would if the user typed it.

### 2. PR Creation

**Capability:** YES (Workaround via Bash / Generic API), NO (Dedicated Tool)
**How it works:**
There are explicitly registered PR tools in [`packages/tools/src/pr.ts`](file:///home/chaitanya/code/december/packages/tools/src/pr.ts): `submitPrTool` and `createPrReviewTool`. However, **these are mocked**. They simply return string messages like `"Successfully submitted PR..."` and do not perform network requests.
Despite the lack of an E2E dedicated PR tool, the agent can still create PRs in two ways:

1. Using the `GitHubTool` ([`packages/tools/src/github.ts`](file:///home/chaitanya/code/december/packages/tools/src/github.ts)), which is a fully functional wrapper around `fetch` for the GitHub REST API. If `GITHUB_TOKEN` is present in the environment, the agent can construct a raw POST request to `/repos/{owner}/{repo}/pulls` to create a PR.
2. Using the `gh` CLI via `BashTool` (e.g. `gh pr create`).

### 3. Issue Creation and Resolution

**Capability:** YES (Workaround via Bash / Generic API)
**How it works:**
There are no dedicated Node.js tools in `packages/tools` specifically for issues. However, the system instructions in [`docs/agents/issue-tracker.md`](file:///home/chaitanya/code/december/docs/agents/issue-tracker.md) explicitly direct the agent to use the GitHub CLI (`gh`) for all issue operations.

- Create: `gh issue create --title "..." --body "..."`
- View: `gh issue view <number> --comments`
- Resolve/Close: `gh issue close <number> --comment "..."`
  The agent executes these commands using the `BashTool`. Alternatively, it can use the `GitHubTool` generic REST wrapper to hit `/repos/{owner}/{repo}/issues`.

### 4. Git Commit

**Capability:** YES
**How it works:**
Similar to general Git execution, committing is fully supported via the `BashTool`. The agent will run commands like `git add .` and `git commit -m "..."`. Because the CLI executes via `child_process.spawn`, it inherits the user's local Git configuration, author identity, and SSH/GPG keys context. E2E implementation is fully present.

### Backend Infrastructure Context

A review of the server (`apps/server`) and worker (`apps/worker`) codebases shows that:

- `apps/server/src/modules/githubapp` handles GitHub App webhook installations and uninstallations. It does not contain code to broker PR creation or issue management on behalf of the user.
- `apps/worker` spins up isolated Firecracker VMs but doesn't handle GitHub operations specifically.
  Therefore, all GitHub and Git capabilities rely heavily on the generic tools (Bash, generic HTTP/REST fetch) loaded into the CLI in [`apps/cli/src/index.ts`](file:///home/chaitanya/code/december/apps/cli/src/index.ts).
