# ADR 0006: PR Review Engine & One-Click Auto-Fix Architecture

## Status

Accepted

## Context

December users require automated, high-precision Pull Request code reviews and automated one-click fix remediation capabilities:

1. **Trigger Surface**: Users can paste a GitHub PR URL on a standalone `/review` page, click a "Review PR" button inside an active session when the agent creates a PR, or receive automated reviews via GitHub webhooks (`pull_request.opened`, `pull_request.synchronize`).
2. **Review Integrity & Verification**: Rather than running plain diff-only LLM prompts, PR reviews require executing typechecks (`tsc`), linters, and unit tests inside an isolated sandbox to detect real build/logic breakages.
3. **GitHub Bot Integration**: Reviews must post to GitHub PRs under `@december-bot` (like CodeRabbit) with inline line comments, GitHub-native `suggestion` blocks, and overall summary bodies without blocking PR merges (`event: "COMMENT"`).
4. **Auto-Fix Workstation Loop**: Maintainers should be able to click a "Fix Issues with December" button under a review to launch/reuse an agent session, check out the PR branch, resolve findings, and push fix commits back to GitHub.

## Decisions

### 1. Ephemeral E2B Cloud Sandbox Execution

- Every PR review provisions an ephemeral E2B sandbox (`@e2b/sandbox`) managed by `apps/worker`.
- The sandbox clones the repository, checks out the PR branch, executes `tsc` / linters / unit tests, runs a structured 4-pillar AI review prompt (Security, Bugs, Architecture, Performance), and self-terminates (`sandbox.kill()`) immediately upon completion (hard timeout: 5 minutes).
- Diff size limit: PRs exceeding 5,000 changed lines are rejected with a `400 Bad Request` error.

### 2. Normalized Domain Data Model (`PrReview` & `PrReviewComment`)

- `PrReview` (parent): Tracks `id`, `prUrl`, `repoOwner`, `repoName`, `prNumber`, `commitSha`, `status` (`PENDING`, `COMPLETED`, `FAILED`, `CLOSED`, `MERGED`), `summary`, `reviewEvent` (`COMMENT`), `e2bSandboxId`, `sessionId`, `userId`, `createdAt`.
- `PrReviewComment` (child): Tracks `id`, `reviewId`, `filePath`, `line`, `side`, `body`, `suggestion`, `githubCommentId`, `status` (`OPEN`, `FIXED`, `IGNORED`).

### 3. GitHub App Authentication (`@december-bot`)

- `apps/server` authenticates as `@december-bot` via `@octokit/auth-app` (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`).
- Validates repository installation before starting review. If missing, prompts user with a 1-click GitHub App installation URL (`https://github.com/apps/december-bot/installations/new`).

### 4. Inline Comment Constraints & Secret Redaction

- Inline GitHub comments target lines inside diff hunks. Out-of-diff findings are appended to the review summary under `## ⚠️ Related Codebase Observations`.
- Regex secret scanning redacts detected credentials to `[REDACTED_SECRET]` and posts a high-priority `🚨 Security Alert` comment.

### 5. Context-Dependent "Fix" Workflow

- **From Session Chat**: Appends the review fix prompt directly into the current active session.
- **From Standalone `/review` Page**: Provisions a new session workspace (`sessionType: "PR_FIX"`), clones the repo, checks out the PR branch, and feeds open `PrReviewComment` items into the agent prompt context.

### 6. Real-Time Streaming & Web UI

- WebSocket event stream (`REVIEW_PROGRESS`, `REVIEW_COMMENT_CREATED`, `REVIEW_COMPLETED`) pushes live findings to `apps/web`.
- Diff viewer (`/review/:reviewId` & `ReviewPane.tsx`) renders syntax-highlighted code diffs with expandable inline suggestion cards.

### 7. Metering & Billing

- Deducts exact E2B sandbox runtime duration cost plus LLM token usage from the user's credit balance. Enforces rate limits via `RateLimiter`.

## Consequences

- **Security & Integrity**: Code reviews run in clean, isolated E2B microVMs without exposing local host assets or leaking secrets.
- **Developer Experience**: Native GitHub `suggestion` blocks enable 1-click commit suggestions on GitHub, while the "Fix" button provides instant automated remediation.
- **Maintainability**: Clear backend module separation (`apps/server/src/modules/review/`) adhering to `AGENTS.md` standards.
