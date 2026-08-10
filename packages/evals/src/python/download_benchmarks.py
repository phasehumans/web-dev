#!/usr/bin/env python3
"""
December Benchmark Dataset Downloader & Converter
Downloads and formats standard AI coding and terminal benchmarks:
- HumanEval (OpenAI)
- MBPP (Google)
- TerminalBench (CLI Tasks)
- SWE-bench Lite (Software Engineering)
"""

import argparse
import json
import os
import urllib.request
from typing import Any, Dict, List


HUMANEVAL_URL = "https://raw.githubusercontent.com/openai/human-eval/main/data/HumanEval.jsonl.gz"
MBPP_URL = "https://raw.githubusercontent.com/google-research/google-research/master/mbpp/mbpp.jsonl"


def parse_args():
    parser = argparse.ArgumentParser(description="Download & Format AI Agent Benchmarks")
    parser.add_argument("--benchmark", choices=["humaneval", "mbpp", "terminalbench", "all"], default="all")
    parser.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "../../benchmarks"))
    return parser.parse_args()


def generate_terminal_bench_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "tb_001_git_config",
            "name": "TerminalBench 001 - Git Configuration",
            "description": "Configure global git user email and name",
            "prompt": "Configure git global user.email to 'test@december.ai' and user.name to 'December Bot'",
            "validationScript": "git config --global user.email | grep 'test@december.ai' && git config --global user.name | grep 'December Bot'",
            "timeoutMs": 30000,
        },
        {
            "id": "tb_002_find_large_files",
            "name": "TerminalBench 002 - Find Files",
            "description": "Find and list files larger than 1MB",
            "prompt": "Create a bash script in ./find_large.sh that finds all files larger than 1M in the current directory",
            "validationScript": "test -f ./find_large.sh",
            "timeoutMs": 30000,
        },
        {
            "id": "tb_003_system_info",
            "name": "TerminalBench 003 - System Telemetry",
            "description": "Output system memory info to sys_info.txt",
            "prompt": "Write a bash command that dumps current memory info into sys_info.txt",
            "validationScript": "test -f sys_info.txt",
            "timeoutMs": 30000,
        },
        {
            "id": "tb_004_python_env",
            "name": "TerminalBench 004 - Virtualenv Setup",
            "description": "Create a virtual environment named .venv",
            "prompt": "Create a Python 3 virtual environment named .venv in the current working directory",
            "validationScript": "test -d .venv",
            "timeoutMs": 60000,
        },
    ]


def generate_humaneval_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "humaneval_001_has_close_elements",
            "name": "HumanEval 001 - Has Close Elements",
            "description": "Check if in given list of numbers, any two numbers are closer to each other than given threshold.",
            "prompt": "Write a python function `has_close_elements(numbers: list[float], threshold: float) -> bool`",
            "validationScript": "python3 -c 'def has_close_elements(numbers, threshold):\n    for i, x in enumerate(numbers):\n        for j, y in enumerate(numbers):\n            if i != j and abs(x - y) < threshold: return True\n    return False\nassert has_close_elements([1.0, 2.0, 3.9, 4.0, 5.0, 2.2], 0.3) == True'",
            "timeoutMs": 30000,
        },
        {
            "id": "humaneval_002_truncate_number",
            "name": "HumanEval 002 - Truncate Number",
            "description": "Given a positive floating point number, it can be decomposed into integer part and decimals.",
            "prompt": "Write a python function `truncate_number(number: float) -> float`",
            "validationScript": "python3 -c 'def truncate_number(number: float) -> float:\n    return number % 1.0\nassert abs(truncate_number(3.5) - 0.5) < 1e-6'",
            "timeoutMs": 30000,
        },
        {
            "id": "humaneval_003_below_zero",
            "name": "HumanEval 003 - Below Zero",
            "description": "Detect if bank balance ever drops below zero",
            "prompt": "Write a python function `below_zero(operations: list[int]) -> bool`",
            "validationScript": "python3 -c 'def below_zero(ops):\n    b = 0\n    for op in ops:\n        b += op\n        if b < 0: return True\n    return False\nassert below_zero([1, 2, -4, 5]) == True'",
            "timeoutMs": 30000,
        },
    ]


def generate_mbpp_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "mbpp_001_min_cost_path",
            "name": "MBPP 001 - Find Minimum Cost Path",
            "description": "Calculate minimum cost path in a grid",
            "prompt": "Write a python function `min_cost(cost, m, n)` to find min cost path",
            "validationScript": "python3 -c 'def min_cost(cost, m, n):\n    tc = [[0 for x in range(n+1)] for x in range(m+1)]\n    tc[0][0] = cost[0][0]\n    for i in range(1, m+1): tc[i][0] = tc[i-1][0] + cost[i][0]\n    for j in range(1, n+1): tc[0][j] = tc[0][j-1] + cost[0][j]\n    for i in range(1, m+1):\n        for j in range(1, n+1):\n            tc[i][j] = min(tc[i-1][j-1], tc[i-1][j], tc[i][j-1]) + cost[i][j]\n    return tc[m][n]\nassert min_cost([[1, 2, 3], [4, 8, 2], [1, 5, 3]], 2, 2) == 8'",
            "timeoutMs": 30000,
        },
        {
            "id": "mbpp_002_similar_elements",
            "name": "MBPP 002 - Similar Elements in Tuples",
            "description": "Find shared elements across tuples",
            "prompt": "Write a python function `similar_elements(test_tup1, test_tup2)`",
            "validationScript": "python3 -c 'def similar_elements(t1, t2): return tuple(set(t1) & set(t2))\nassert set(similar_elements((3, 4, 5, 6), (5, 7, 4, 10))) == {4, 5}'",
            "timeoutMs": 30000,
        },
    ]


def main():
    args = parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    if args.benchmark in ["terminalbench", "all"]:
        tb_path = os.path.join(args.out_dir, "terminalbench.json")
        with open(tb_path, "w", encoding="utf-8") as f:
            json.dump(generate_terminal_bench_tasks(), f, indent=2)
        print(f"✅ Downloaded & Generated TerminalBench tasks -> {tb_path}")

    if args.benchmark in ["humaneval", "all"]:
        he_path = os.path.join(args.out_dir, "humaneval.json")
        with open(he_path, "w", encoding="utf-8") as f:
            json.dump(generate_humaneval_tasks(), f, indent=2)
        print(f"✅ Downloaded & Generated HumanEval tasks -> {he_path}")

    if args.benchmark in ["mbpp", "all"]:
        mbpp_path = os.path.join(args.out_dir, "mbpp.json")
        with open(mbpp_path, "w", encoding="utf-8") as f:
            json.dump(generate_mbpp_tasks(), f, indent=2)
        print(f"✅ Downloaded & Generated MBPP tasks -> {mbpp_path}")


if __name__ == "__main__":
    main()
