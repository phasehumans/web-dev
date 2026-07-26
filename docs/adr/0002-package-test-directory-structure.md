# 2. Package Unit & Integration Test Architecture

Date: 2026-07-26

## Status

Accepted

## Context

The monorepo packages (`@december/agent`, `@december/tools`, `@december/providers`) require structured unit and integration tests using `bun test`. Previously, test files were located in a flat `test/` folder mixing test helpers, unit tests, and integration tests.

## Decision

1. **Dual Scope (Unit + Integration Tests)**:
    - All three core packages (`agent`, `tools`, `providers`) will maintain explicit unit tests and integration tests.
    - Unit tests run fast, isolated assertions using mocks.
    - Integration tests verify real OS operations (filesystem, processes) and multi-component loops (agent + tool execution) or MSW-simulated HTTP streaming.

2. **Standardized Directory Structure**:
   Each package will adopt the following standard layout:

    ```
    packages/<pkg>/
    ├── src/
    └── test/
        ├── helpers/          # Test fixtures, mock contexts, MSW servers
        ├── unit/             # Isolated unit tests (*.unit.test.ts or *.test.ts)
        └── integration/      # Multi-component / real IO / MSW integration tests (*.integration.test.ts)
    ```

3. **Execution Scripts**:
    - `package.json` scripts in packages:
        - `"test"`: `"bun test test/unit test/integration"`
        - `"test:unit"`: `"bun test test/unit"`
        - `"test:integration"`: `"bun test test/integration"`
    - Network integration tests hitting external live LLM APIs are gated behind `RUN_LIVE_TESTS=true` to prevent flaky CI failures and preserve offline execution.

## Consequences

- Clean separation between fast local unit tests and comprehensive integration tests.
- Reusable test helpers isolated in `test/helpers/`.
- Uniform test architecture across `@december/agent`, `@december/tools`, and `@december/providers`.
