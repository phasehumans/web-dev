#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict


def parse_args():
    parser = argparse.ArgumentParser(description="December SWE-bench Evaluation Harness")
    parser.add_argument("--task-file", required=True, help="Path to JSON task or dataset file")
    parser.add_argument("--output-dir", default="./eval_results", help="Directory for eval reports")
    parser.add_argument("--agent-cmd", default="bun run dev:cli", help="Command to invoke agent")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout in seconds")
    return parser.parse_args()


def run_evaluation(task: Dict[str, Any], agent_cmd: str, timeout: int, output_dir: str) -> Dict[str, Any]:
    task_id = task.get("id") or task.get("instance_id") or "unknown_task"
    prompt = task.get("prompt") or task.get("problem_statement") or ""
    validation_script = task.get("validationScript") or task.get("test_patch") or "exit 0"

    start_time = time.time()
    os.makedirs(output_dir, exist_ok=True)

    result = {
        "taskId": task_id,
        "status": "PASS",
        "exitCode": 0,
        "durationMs": 0,
        "tokenUsage": {
            "promptTokens": 0,
            "completionTokens": 0,
            "totalTokens": 0,
        },
        "trajectoryPath": os.path.join(output_dir, f"{task_id}.json"),
        "error": None,
    }

    try:
        # Run agent command in environment
        env = os.environ.copy()
        if "env" in task and isinstance(task["env"], dict):
            env.update(task["env"])

        agent_proc = subprocess.run(
            agent_cmd,
            shell=True,
            input=prompt,
            text=True,
            capture_output=True,
            timeout=timeout,
            env=env,
        )

        if agent_proc.returncode != 0:
            result["status"] = "FAIL"
            result["exitCode"] = agent_proc.returncode
            result["error"] = agent_proc.stderr or "Agent exited with non-zero code"
        else:
            # Run validation script
            val_proc = subprocess.run(
                validation_script,
                shell=True,
                text=True,
                capture_output=True,
                timeout=timeout,
            )
            if val_proc.returncode != 0:
                result["status"] = "FAIL"
                result["exitCode"] = val_proc.returncode
                result["error"] = val_proc.stderr or "Validation script failed"

    except subprocess.TimeoutExpired:
        result["status"] = "TIMEOUT"
        result["exitCode"] = 124
        result["error"] = f"Task timed out after {timeout} seconds"
    except Exception as e:
        result["status"] = "ERROR"
        result["exitCode"] = 1
        result["error"] = str(e)

    result["durationMs"] = int((time.time() - start_time) * 1000)

    # Save trajectory report
    report_path = os.path.join(output_dir, f"{task_id}_result.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    return result


def main():
    args = parse_args()
    if not os.path.exists(args.task_file):
        print(f"Error: task file '{args.task_file}' not found.", file=sys.stderr)
        sys.exit(1)

    with open(args.task_file, "r", encoding="utf-8") as f:
        task_data = json.load(f)

    if isinstance(task_data, list):
        tasks = task_data
    else:
        tasks = [task_data]

    results = []
    for task in tasks:
        res = run_evaluation(task, args.agent_cmd, args.timeout, args.output_dir)
        results.append(res)

    print(json.dumps(results if len(results) > 1 else results[0], indent=2))


if __name__ == "__main__":
    main()
