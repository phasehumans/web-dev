# Glossary & Domain Model

## RepositoryWiki

A documentation structure generated for a user's GitHub repository. Owned by a User and identified by `repoFullName` (e.g. `owner/repo`). Tracks the generation status (`IDLE`, `GENERATING`, `COMPLETED`, `FAILED`) and holds a collection of `WikiPage` entries.

## WikiPage

A single markdown documentation page belonging to a `RepositoryWiki`. Contains a title, URL slug, markdown content, and display order.

## WikiChat

A interactive chat interface embedded within a `RepositoryWiki` viewer. Allows users to submit prompts and ask an AI agent questions specifically grounded in the repository's codebase and wiki documentation.

## RateLimiter

A tiered rate limiting system enforcing API access quotas globally across API routes and per-module tiers. Keys client identities by `userId`, API Token, or IP address, supports in-memory and Redis storage backends, and emits standard `RateLimit-*` headers and 429 error responses.

## StructuredLogger

A Pino-based logging subsystem providing structured JSON logs, request ID correlation (`x-request-id`), and module-scoped child loggers (`logger.child({ module })`).

## NavigationSearchIndex

A canonical index of site pages and subpages across the web application. Used by the Search Modal to provide instant keyboard-driven route navigation (`Cmd+K`). Supports rich search indexing over page titles, sub-titles, route paths, and Intent Alias Keywords (e.g. mapping "dark mode" -> Preferences, "api key" -> Secrets).

## EvalTask

A standardized specification for an agent evaluation benchmark task. Defines the initial workspace snapshot, user prompt, resource limits (max turns, timeouts), and validation script command.

## EvalRunner

The orchestration component in `@december/evals` that executes an `EvalTask` against an `Agent` instance inside a configured execution backend (`apps/runtime` sandbox or local fallback), recording performance metrics and evaluating task completion.

## TrajectoryLog

A step-by-step event log (`trajectory.jsonl`) generated during an evaluation run. Captures turn-by-turn prompts, agent actions, tool inputs, tool execution outputs, token consumption, and step latencies.

## EvalReport

A structured summary report (`summary.json`) produced at the conclusion of an evaluation suite run. Contains aggregate metrics including pass rates (Pass@1), total execution duration, token usage totals, and cost metrics.
