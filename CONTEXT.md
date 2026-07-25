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
