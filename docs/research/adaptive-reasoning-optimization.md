# Adaptive Reasoning Optimization in Coding CLI Agents

This document explores how to advance and improve "Adaptive Reasoning"—the dynamic allocation of thinking levels and reasoning budgets—in coding CLI agents like December CLI, Claude Code, Antigravity, Cursor, and Aider.

## 1. Multi-Tier Intent & Complexity Classification

Modern coding agents must decide how much effort to expend on a user query. This is typically achieved through one of three strategies:

- **Heuristics:** Fast and simple. Involves regex or keyword matching (e.g., detecting "refactor", "debug", or "test" vs "hello"). While zero-latency, heuristics are brittle and easily confused by complex but brief prompts.
- **Lightweight Intent Classifier Models:** Uses a smaller, faster model (e.g., Claude 3.5 Haiku, Gemini 1.5 Flash, or gpt-4o-mini) to act as a router. This model classifies the task (e.g., `chat`, `lookup`, `edit`, `architect`) and routes it to a more capable model (e.g., Claude 3.7 Sonnet, OpenAI o3) with an appropriate reasoning budget. This adds slight initial latency but saves massive costs on simple queries.
- **Tool-Requirement Prediction (Agentic CoT):** The state-of-the-art approach used by tools like Claude Code. Instead of separate classification, the model relies on inherent reasoning (Chain-of-Thought) and adaptive thinking. The model decomposes tasks and dynamically predicts which tools (file readers, shell commands) are required for the next step. Intent is captured natively through the model's integrated reasoning rather than a separate routing layer.

## 2. Dynamic Reasoning Budget Scaling

Task types should be mapped directly to reasoning budgets to optimize latency, cost, and output quality. This dynamic scaling can be modeled as follows:

- **Off / None:** For general chat, greetings, and simple conversational follow-ups.
- **Minimal (e.g., 1k - 2k tokens):** For simple lookups, file reads, or single-line explanations.
- **Medium (e.g., 4k - 8k tokens):** For targeted single-file edits, straightforward bug fixes, and localized logic generation. Often the default setting for development tasks.
- **High / Max (e.g., 16k+ tokens):** For multi-file refactoring, complex test debugging, system architecture design, and diagnosing obscure errors.

## 3. Failure-Triggered Escalation

Instead of static budgets, adaptive agents should implement a self-healing loop with **Failure-Triggered Escalation**. If the agent initiates a task on a `minimal` or `medium` budget and encounters friction, it should automatically retry with a higher reasoning budget.

**Triggers for Escalation (e.g., `off` -> `high`):**

- **Tool Call Failures:** The agent attempts a shell command that returns a non-zero exit code (e.g., linting error, missing dependency) multiple times.
- **Test Failures:** The agent writes code, runs tests, and they fail. The subsequent context window requires deep analysis of the stack trace.
- **Agent Loop Exceptions:** The agent gets stuck in a tool-calling loop (calling the same tool with the same failed parameters) or outputs malformed JSON. A higher reasoning budget forces the model to step back and re-evaluate its approach.

## 4. User Steering & Overrides

While automated budget allocation is powerful, users must retain control over the agent's latency and cost via intuitive CLI interfaces.

- **Slash Commands:** Provide explicit per-session or per-turn modifiers:
    - `/fast`: Forces the model to bypass thinking (budget = 0) for immediate execution.
    - `/think` or `/deep`: Forces maximum reasoning budget for the next prompt.
    - `/auto`: Returns to the dynamic, intent-based adaptive reasoning mode.
- **Per-Turn Flags:** CLI flags attached to single prompts (e.g., `agent "fix this bug" --think=high`).

## 5. Primary API Sources and Specifications

Modern LLM APIs provide native parameters to control reasoning effort.

### Anthropic API (Extended / Adaptive Thinking)

Anthropic allows control via the `thinking` parameter in the Messages API:

- **Adaptive Thinking:** `{"type": "adaptive"}`. The model dynamically scales reasoning. Some models support further tuning via `effort` (`low`, `medium`, `high`, `max`). Recommended for Claude 3.7+ models.
- **Extended Thinking (Legacy/Manual):** `{"type": "enabled", "budget_tokens": 4096}`. Forces a specific token budget. Requires `max_tokens` > 21,333 and streaming.

### Google Gemini API (thinkingConfig)

Gemini models manage reasoning through the `thinkingConfig` object:

- `thinkingBudget`: Positive integer for a strict limit, `-1` for dynamic/automatic scaling, `0` to disable.
- `thinkingLevel`: For newer models (Gemini 3+), accepts enums like `MINIMAL`, `LOW`, `MEDIUM`, and `HIGH`.
- `includeThoughts`: Boolean to expose the reasoning process to the user.

### OpenAI API (o1 / o3 series)

OpenAI utilizes the `reasoning_effort` parameter to control computational depth:

- **Values:** `low`, `medium` (default), and `high`.
- Controls the hidden chain-of-thought token budget. Higher values yield better problem-solving at the cost of increased latency and token usage.
