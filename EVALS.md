# Evaluation Framework

The evaluation framework in [`packages/evals`](file:///home/chaitanya/code/december/packages/evals) measures coding accuracy and terminal execution capabilities across official benchmarks and custom tasks.

## Commands

Run all benchmarks:

```bash
bun run eval
```

Run specific benchmark suites:

```bash
# OpenAI HumanEval (164 tasks)
bun run eval:humaneval

# Google MBPP (974 tasks)
bun run eval:mbpp

# TerminalBench CLI tasks
bun run eval:terminalbench

# SWE-bench (Docker)
bun run eval:swebench
```

## Structure

```
packages/evals/
├── benchmarks/      # Task definitions (.json)
├── src/             # Evaluation runner and CLI logic
└── test/            # Unit tests
```

## Outputs

Benchmark runs output to stdout and save summary reports to `eval_results/summary.json`:

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
            "durationMs": 14
        }
    ]
}
```

## Custom Tasks

Add `.json` task files to `packages/evals/benchmarks/`:

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
