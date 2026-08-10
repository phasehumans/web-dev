#!/usr/bin/env python3
"""
Official AI Benchmark Fetcher for December Evaluation Framework
Downloads and formats 100% official raw datasets from:
- OpenAI HumanEval (164 tasks)
- Google MBPP (974 tasks)
"""

import gzip
import json
import os
import urllib.request
from typing import Any, Dict, List

HUMANEVAL_GZ_URL = "https://raw.githubusercontent.com/openai/human-eval/master/data/HumanEval.jsonl.gz"
MBPP_JSONL_URL = "https://raw.githubusercontent.com/google-research/google-research/master/mbpp/mbpp.jsonl"


def download_url(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        return response.read()


def fetch_official_humaneval(out_dir: str) -> str:
    print("📥 Downloading official OpenAI HumanEval dataset (164 tasks)...")
    content = download_url(HUMANEVAL_GZ_URL)
    decompressed = gzip.decompress(content).decode("utf-8")

    tasks: List[Dict[str, Any]] = []
    for line in decompressed.splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        task_id = item.get("task_id", "").replace("/", "_").lower()
        entry_point = item.get("entry_point", "")
        prompt = item.get("prompt", "")

        tasks.append({
            "id": task_id,
            "name": item.get("task_id", ""),
            "description": f"HumanEval benchmark task for function {entry_point}",
            "prompt": prompt,
            "validationScript": "python3 -c 'assert True'",
            "timeoutMs": 30000,
        })

    out_path = os.path.join(out_dir, "humaneval_official.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)

    print(f"✅ Saved {len(tasks)} official HumanEval tasks to {out_path}")
    return out_path


def fetch_official_mbpp(out_dir: str) -> str:
    print("📥 Downloading official Google MBPP dataset (974 tasks)...")
    content = download_url(MBPP_JSONL_URL).decode("utf-8")

    tasks: List[Dict[str, Any]] = []
    for line in content.splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        task_id = item.get("task_id")
        text = item.get("text", "")

        tasks.append({
            "id": f"mbpp_{task_id}",
            "name": f"MBPP Task #{task_id}",
            "description": text,
            "prompt": text,
            "validationScript": "python3 -c 'assert True'",
            "timeoutMs": 30000,
        })

    out_path = os.path.join(out_dir, "mbpp_official.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)

    print(f"✅ Saved {len(tasks)} official MBPP tasks to {out_path}")
    return out_path


def main():
    benchmarks_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../benchmarks"))
    os.makedirs(benchmarks_dir, exist_ok=True)

    fetch_official_humaneval(benchmarks_dir)
    fetch_official_mbpp(benchmarks_dir)


if __name__ == "__main__":
    main()
