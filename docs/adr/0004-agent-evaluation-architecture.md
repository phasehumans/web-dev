# 4. Agent Evaluation Subsystem Architecture (@december/evals)

Date: 2026-07-26

## Status

Accepted

## Context

As `packages/agent` and `apps/cli` evolve, prompt modifications, system instructions, tool additions, and model upgrades present risks of silent behavioral regression or quality degradation. Without empirical evaluation benchmarks, measuring agent accuracy, step efficiency, and token costs across releases relies on manual, non-deterministic testing.

## Decision

1. **Target Scope**:
    - Adopt a phased rollout: Phase 1 evaluates `packages/agent` headlessly inside execution environments; Phase 2 expands to E2E terminal testing of `apps/cli`.

2. **Package Placement (`packages/evals`)**:
    - Create `@december/evals` as a standalone monorepo package housing task definitions (`EvalTask`), the execution harness (`EvalRunner`), trajectory logging (`TrajectoryLog`), and reporting (`EvalReport`).

3. **Task Specification & Storage (Hybrid Model)**:
    - Define a canonical `EvalTask` schema for in-repo tasks (`packages/evals/tasks/*.json` / `.ts`).
    - Support adapter loaders for standard external benchmark suites (e.g. SWE-bench Lite).

4. **Deterministic Validation Only**:
    - Validate task completion strictly via deterministic test execution exit codes (code `0` = PASS, non-zero = FAIL) within the runtime. Exclude non-deterministic LLM-as-a-judge scoring from primary evaluations.

5. **Configurable Execution Backend**:
    - Default to `apps/runtime` Firecracker VM / container sandboxes for isolation and zero state pollution across runs.
    - Support a `--local` fallback execution flag for rapid local task creation and debugging.

6. **Telemetry & Artifacts**:
    - Write turn-by-turn trajectory logs (`trajectory.jsonl`) per task capturing messages, tool calls, tool outputs, token counts, and latencies.
    - Generate a suite-level summary report (`summary.json`) containing Pass@1 metrics, total execution time, token totals, and estimated costs.

## Consequences

- Prevents prompt and tool regressions through automated, deterministic CI benchmarks.
- Provides turn-by-turn trajectory logs (`trajectory.jsonl`) suitable for trajectory debugging and dataset generation for fine-tuning.
- Isolates evaluation execution safely inside `apps/runtime` sandboxes by default.
