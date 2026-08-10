# December Evaluation Framework & Benchmark Guide (`EVALS.md`)

Welcome to the **December Evaluation Framework**. This document provides a complete guide on how evaluation benchmarks work in December, how to run evaluation tasks, how to interpret metrics, and how to create custom benchmark datasets.

---

## 🎯 Overview & Architecture

The evaluation system in December lives inside the **[`packages/evals`](file:///home/chaitanya/code/december/packages/evals)** workspace package. It allows maintainers, developers, and AI researchers to measure the performance, coding accuracy, and task completion success rate of the December AI agent quantitatively.

```
packages/evals/
├── benchmarks/              # Benchmark dataset files (.json / .eval.ts)
│   └── humaneval_sample.json
├── src/
│   ├── types.ts             # Evaluation interfaces (EvalTask, EvalResult, EvalSummaryReport)
│   ├── schema.ts            # Zod validation schemas for task formats
│   ├── task-loader.ts       # Task file loader (supports single tasks & arrays)
│   ├── python-runner.ts     # TypeScript bridge spawning Python harness
│   ├── runner.ts            # Suite runner, Pass@1 calculation, & metric reporting
│   ├── cli.ts               # CLI runner entrypoint
│   └── python/
│       ├── requirements.txt # Python dependencies (pytest, docker)
│       └── swe_bench_harness.py # Python evaluation engine for SWE-bench
└── test/
    └── unit/                # Unit test suites for evals package
```

---

## 🚀 Quick Start: How to Run Evals

### 1. Run Evals Unit Tests

To verify that the evaluation runner package is working properly:

```bash
bun run test:evals
# OR
cd packages/evals && bun test
```

### 2. Run Benchmark Evaluation Suite

To execute evaluation benchmark tasks against December:

```bash
bun run eval
# OR
cd packages/evals && bun run eval
```

### 3. Run Benchmarks against Custom Agent Commands or Directories

You can specify custom task directories, output directories, or custom agent invocation commands:

```bash
bun run eval --dir ./packages/evals/benchmarks --out ./eval_results --agent-cmd "bun run dev:cli"
```

---

## 📊 Benchmark Summary & Reports

When a benchmark suite completes execution, it outputs a formatted CLI summary and saves a structured JSON report to `eval_results/summary.json`:

```text
==================================================
📊 DECEMBER EVALUATION BENCHMARK SUMMARY
==================================================
 Pass Rate (Pass@1) : 100%
 Total Tasks       : 2
 Passed            : 2
 Failed            : 0
 Errors            : 0
 Timeouts          : 0
 Mean Duration     : 14 ms
 Summary Report    : eval_results/summary.json
==================================================
```

### Generated JSON Summary Format (`eval_results/summary.json`)

```json
{
    "timestamp": "2026-08-10T08:15:01.000Z",
    "totalTasks": 2,
    "passedTasks": 2,
    "failedTasks": 0,
    "errorTasks": 0,
    "timeoutTasks": 0,
    "passRate": 100.0,
    "meanDurationMs": 14,
    "results": [
        {
            "taskId": "humaneval_001",
            "status": "PASS",
            "exitCode": 0,
            "durationMs": 14,
            "tokenUsage": {
                "promptTokens": 0,
                "completionTokens": 0,
                "totalTokens": 0
            },
            "trajectoryPath": "eval_results/humaneval_001.json"
        }
    ]
}
```

---

## 📝 Defining Custom Benchmark Tasks

Benchmark tasks can be created as `.json` or `.eval.ts` files inside `packages/evals/benchmarks/` or any custom directory.

### Task Schema Fields

| Field              | Type                     | Required | Description                                                         |
| :----------------- | :----------------------- | :------- | :------------------------------------------------------------------ |
| `id`               | `string`                 | **Yes**  | Unique identifier for the benchmark task.                           |
| `name`             | `string`                 | **Yes**  | Human-readable name of the task.                                    |
| `description`      | `string`                 | No       | Short description of what the task tests.                           |
| `prompt`           | `string`                 | **Yes**  | Prompt passed to the AI agent.                                      |
| `validationScript` | `string`                 | **Yes**  | Shell/Python command executed to verify solution correctness.       |
| `timeoutMs`        | `number`                 | No       | Maximum time allowed (in milliseconds). Default: `300000` (5 mins). |
| `env`              | `Record<string, string>` | No       | Custom environment variables for task execution.                    |

### Task Example (`packages/evals/benchmarks/sample_tasks.json`)

```json
[
    {
        "id": "task_string_reversal",
        "name": "Reverse String Task",
        "description": "Tests string manipulation",
        "prompt": "Write a python script that prints the reversal of hello world",
        "validationScript": "python3 -c 'assert \"dlrow olleh\" in \"dlrow olleh\"'",
        "timeoutMs": 30000
    }
]
```

---

## 🐍 Python SWE-bench Support

For advanced AI research evaluations, the Python harness (`packages/evals/src/python/swe_bench_harness.py`) supports downloading and executing **SWE-bench** datasets and running validation tests inside Docker containers.

To install optional Python dependencies for SWE-bench execution:

```bash
pip install -r packages/evals/src/python/requirements.txt
```
