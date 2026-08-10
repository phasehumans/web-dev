# December Evaluation Framework & Benchmark Guide (`EVALS.md`)

Welcome to the **December Evaluation Framework**. This document provides a complete guide on how evaluation benchmarks work in December, how to run evaluation tasks, how to interpret metrics, and how to execute individual official benchmarks (**HumanEval**, **MBPP**, **TerminalBench**, and **SWE-bench**).

---

## 🎯 Overview & Architecture

The evaluation system in December lives inside the **[`packages/evals`](file:///home/chaitanya/code/december/packages/evals)** workspace package. It allows maintainers, developers, and AI researchers to measure coding accuracy and terminal execution capabilities quantitatively.

```
packages/evals/
├── benchmarks/
│   ├── humaneval_official.json      # Official OpenAI HumanEval dataset (164 tasks)
│   ├── mbpp_official.json           # Official Google MBPP dataset (974 tasks)
│   └── terminalbench_official.json  # Official TerminalBench CLI tasks (5 tasks)
├── src/
│   ├── types.ts                     # Interfaces (EvalTask, EvalResult, EvalSummaryReport)
│   ├── schema.ts                    # Zod validation schemas
│   ├── task-loader.ts               # File & directory task loader
│   ├── python-runner.ts             # Python evaluation bridge
│   ├── runner.ts                    # Suite runner & Pass@1 metric reporter
│   ├── cli.ts                       # CLI runner entrypoint
│   └── python/
│       ├── download_benchmarks.py   # Downloader script for HumanEval & MBPP datasets
│       ├── requirements.txt         # Optional Python dependencies
│       └── swe_bench_harness.py     # Python evaluation harness for SWE-bench
└── test/
    └── unit/                        # Unit test suite for evals
```

---

## 🚀 Individual Benchmark Commands

You can test December on each benchmark suite **individually** using dedicated CLI commands:

### 1. 🐍 HumanEval Benchmark (OpenAI - 164 Tasks)

Evaluates function-level Python code generation across 164 official problems:

```bash
bun run eval:humaneval
```

### 2. 🧮 MBPP Benchmark (Google Research - 974 Tasks)

Evaluates basic Python algorithm generation across 974 official problems:

```bash
bun run eval:mbpp
```

### 3. 💻 TerminalBench (CLI Terminal Tasks)

Evaluates terminal CLI commands, Git configuration, process monitoring, and environment setup:

```bash
bun run eval:terminalbench
```

### 4. 🐳 SWE-bench (Software Engineering - Docker)

Evaluates end-to-end repository issue resolution across Python codebases:

```bash
bun run eval:swebench
```

### 5. ⚡ Run All Benchmarks Combined

```bash
bun run eval
```

---

## 📊 Benchmark Summary & Reports

When any benchmark completes execution, it outputs a CLI summary table and saves a structured JSON report to `eval_results/summary.json`:

```text
==================================================
📊 DECEMBER EVALUATION BENCHMARK SUMMARY
==================================================
 Pass Rate (Pass@1) : 100%
 Total Tasks       : 164
 Passed            : 164
 Failed            : 0
 Errors            : 0
 Timeouts          : 0
 Mean Duration     : 30 ms
 Summary Report    : eval_results/summary.json
==================================================
```

### Generated JSON Summary Format (`eval_results/summary.json`)

```json
{
    "timestamp": "2026-08-10T08:23:32.000Z",
    "totalTasks": 164,
    "passedTasks": 164,
    "failedTasks": 0,
    "errorTasks": 0,
    "timeoutTasks": 0,
    "passRate": 100.0,
    "meanDurationMs": 30,
    "results": [
        {
            "taskId": "humaneval_0",
            "status": "PASS",
            "exitCode": 0,
            "durationMs": 14,
            "tokenUsage": {
                "promptTokens": 0,
                "completionTokens": 0,
                "totalTokens": 0
            },
            "trajectoryPath": "eval_results/humaneval_0.json"
        }
    ]
}
```

---

## 📝 Defining Custom Benchmark Tasks

Custom benchmark task files can be added to `packages/evals/benchmarks/` as `.json` or `.eval.ts` files:

```json
[
    {
        "id": "task_git_config",
        "name": "Configure Git User",
        "description": "Configures git global settings",
        "prompt": "Set git global user.email to 'bot@december.ai'",
        "validationScript": "git config --global user.email | grep 'bot@december.ai'",
        "timeoutMs": 30000
    }
]
```
