# Architecture & Design: Self-Learning and Growing Coding Agent Harness for December

**Author:** Deep Research & Systems Architecture Team  
**Target System:** December Agent Core (`packages/agent`, `packages/tools`, `packages/database`, `apps/worker`, `apps/cli`)  
**Status:** Architectural Specification & Research Whitepaper  
**Date:** September 2026

---

## 1. Executive Summary & Fundamental Thesis

Modern LLM-based software engineering agents are transitioning from static, prompt-wrapped inference loops into **continually evolving, self-improving cognitive systems**. However, existing approaches to agent autonomy diverge significantly in philosophy, design trade-offs, and production viability:

1. **The Nous Research Hermes Paradigm**: Prioritizes open-weights steerability, uncensored autonomy, natural language roleplay/world simulation, and generalized XML tool calling (`<tool_call>`, `<tool_response>`). Hermes excels as an unconstrained reasoning engine and multi-turn conversational coordinator, but **lacks the deterministic runtime verification, formal compiler/AST integration, and sandboxed test-driven feedback** strictly required for mission-critical software engineering.
2. **The Anthropic Claude Code & OpenAI SWE Paradigm**: Focuses on rigorous, deterministic, terminal-native harnesses—emphasizing static prompt caching prefixes, compact tool definitions, surgical diff/patch application, continuous test execution, and hierarchical rule configuration (`CLAUDE.md` / `AGENTS.md`). While robust, these systems are fundamentally **stateless across projects and static in capabilities** unless augmented by explicit experiential learning harnesses.

```
+---------------------------------------------------------------------------------------------------+
|                                  THE DECEMBER AGENT HARNESS                                       |
|                                                                                                   |
|   +--------------------------+     +--------------------------+     +--------------------------+  |
|   |  Pillar 1: In-Context    |     |  Pillar 2: Autonomous    |     |  Pillar 3: Ground-Truth  |  |
|   |  Experiential Learning   |     |  Tool & Skill Synthesis  |     |  Verification Engine     |  |
|   |  (Reflexion + ExpeL)     |     |  (Voyager + LATM)        |     |  (TDD + AST + Linters)   |  |
|   +------------+-------------+     +------------+-------------+     +------------+-------------+  |
|                |                                |                                |                |
|                +--------------------------------+--------------------------------+                |
|                                                 |                                                 |
|                                                 v                                                 |
|                               +----------------------------------+                                |
|                               | Pillar 4: Trajectory & Dataset   |                                |
|                               | Distillation Flywheel (SFT/DPO)  |                                |
|                               +----------------------------------+                                |
+---------------------------------------------------------------------------------------------------+
```

### The Core Invariant

A self-learning coding agent cannot rely solely on weight updates (which are slow, expensive, and risk catastrophic forgetting) nor solely on in-context prompt stuffing (which consumes context windows and degrades attention).

Instead, **December's Self-Learning and Growing Harness** combines:

1. **Fast-Loop In-Context Experiential Learning**: Multi-turn verbal reinforcement learning (Reflexion) and cross-session rule synthesis (ExpeL) stored in structured project memory (`.december/rules.md`).
2. **Autonomous Tool & Skill Synthesis**: Dynamic creation, unit testing, and sandbox deployment of reusable TypeScript/Bun tool scripts and MCP servers (Voyager & LATM paradigms).
3. **Deterministic Ground-Truth Verification**: AST-level error parsing, automated reproduction test generation (TDD), and pre/post-flight test suites.
4. **Slow-Loop Trajectory Distillation Flywheel**: Telemetry-driven filtering of verified trajectories to generate high-fidelity SFT and DPO preference datasets for continuous local adapter / model fine-tuning.

---

## 2. Deconstruction & Comparative Analysis: Hermes vs. Claude Code vs. Codex / SWE

To build an explicit self-growing coding agent, we must understand the architectural ancestry, strengths, and failure modes of the leading agentic paradigms.

```
+-------------------------------------------------------------------------------------------------------+
|                                      PARADIGM COMPARISON MATRIX                                       |
+---------------------+-------------------------+---------------------------+---------------------------+
| Dimension           | Nous Research Hermes    | Anthropic Claude Code     | OpenAI Codex / SWE-agent  |
+---------------------+-------------------------+---------------------------+---------------------------+
| Core Philosophy     | Uncensored steerability,| Deterministic CLI harness | High-accuracy benchmarks; |
|                     | open-weights autonomy,  | for production codebase   | ACI (Agent-Computer       |
|                     | world simulation.       | manipulation.             | Interface) optimization.  |
+---------------------+-------------------------+---------------------------+---------------------------+
| Tool-Calling Format | Custom XML tags:        | Structured JSON schemas   | Python/JSON tool schemas  |
|                     | <tool_call>{...}        | via API / native JSON     | or custom bash wrappers   |
|                     | </tool_call>            | schema format.            | (SWE-agent ACI commands). |
+---------------------+-------------------------+---------------------------+---------------------------+
| Reasoning Loop      | <SCRATCHPAD>, <THINK>,  | Native hidden CoT or      | ReAct / Plan-and-Solve /  |
|                     | <PLAN>, <REASONING>     | system prompt reasoning   | o1/o3 internal search.    |
+---------------------+-------------------------+---------------------------+---------------------------+
| Environment / State | Freeform text/simulated | Local filesystem, Git,    | Containerized headless    |
|                     | environment (WorldSim). | Bash subshells, PTYs.     | sandbox (Docker/SWE-bench)|
+---------------------+-------------------------+---------------------------+---------------------------+
| Verification Loop   | None (assumes tool or   | Explicit test/type-check  | Automated pytest / patch  |
|                     | user confirms result).  | execution via Bash tool.  | verification against repo.|
+---------------------+-------------------------+---------------------------+---------------------------+
| Context Strategy    | Standard KV context;    | Dynamic Compaction, Tool  | Trajectory truncation,    |
|                     | relies on user prompts. | Evaporation, Prompt Cache.| specialized view windows. |
+---------------------+-------------------------+---------------------------+---------------------------+
| Self-Improvement    | Offline synthetic SFT / | Static rules file         | Offline RL / fine-tuning; |
|                     | DPO dataset curation.   | (CLAUDE.md) updated manually| prompt-based reflex loops.|
+---------------------+-------------------------+---------------------------+---------------------------+
```

### 2.1 What Makes Hermes "Hermes"?

Nous Research created the Hermes family (from OpenHermes 1/2/2.5 to Hermes 2 Pro, Hermes 2 Mixtral, and Hermes 3 on Llama 3.1 8B/70B/405B) with a distinct ideological and technical identity:

1. **Steerability & Role Flexibility**: Unlike commercial models aligned with heavy guardrails, Hermes is instruction-tuned to adopt arbitrary personas, execute deep roleplay, and adhere strictly to system prompt instructions without moralizing or refusal.
2. **Structured XML Scaffolding**: Hermes pioneered structured XML tags for multi-step reasoning and function calling directly within open-weights chat formats:
    ```xml
    <SCRATCHPAD>
    Analyzing dependency tree of packages/agent...
    </SCRATCHPAD>
    <tool_call>
    {"name": "grep_search", "arguments": {"query": "SessionRepository", "SearchPath": "/workspace"}}
    </tool_call>
    ```
3. **WorldSim & Autonomous Persona Environments**: Nous Research built **WorldSim**, an agentic simulator where LLMs generate and interact in simulated social, physical, and virtual worlds. The model acts as both world generator, actor, and physics arbiter.
4. **Synthetic Dataset Generation**: The OpenHermes datasets (curated by Teknium et al.) pioneered high-quality synthetic multi-turn conversations, code execution traces, math reasoning, and complex tool-use demonstrations derived from multi-model pipelines.

#### Why Generic Hermes Fails at Production Coding

While Hermes provides an exceptional reasoning backbone, deploying a raw Hermes model directly as an autonomous coding agent exposes critical vulnerabilities:

- **Lack of Deterministic AST / Type-Checking Feedback**: Hermes generates code believing it to be syntactically valid. Without a deterministic compiler feedback loop, hallucinated APIs or typing mistakes compound across multi-turn interactions.
- **Unconstrained Tool Hallucination**: Hermes will attempt to invent CLI tools or non-existent system binaries if not constrained by strict schemas and deterministic execution harnesses.
- **Context Saturation**: In long software engineering sessions (50+ turns), raw Hermes lacks automatic tool output evaporation and KV cache management, leading to context degradation and lost instructions.
- **No Git / State Rollback**: Hermes cannot recover from destructive file rewrites without an explicit harness that takes pre-flight snapshots and manages differential patches.

---

### 2.2 Anthropic Claude Code: The Deterministic Production CLI Harness

Anthropic's Claude Code demonstrates the state-of-the-art in production engineering agent design:

1. **Prompt Caching Architecture**:
    - The harness maintains a strict split between a **static system prompt prefix** (tools, operating rules, guardrails) and dynamic runtime state (current working directory, date, modified files).
    - This ensures 90%+ KV prompt cache hit rates on modern providers, reducing latency and cost by over 80%.
2. **Context Compaction & Evaporation**:
    - **Evaporation**: Old tool execution outputs (e.g., a 500-line `grep` result from 10 turns ago) are replaced with a single-line summary (`[Output from grep_search trimmed: 42 matches found]`).
    - **Compaction**: When conversation history exceeds a safety threshold (e.g., 75% of context limit), Claude Code invokes a summarization sub-loop that compacts past steps into an architectural recap, preserving pending tasks while truncating message arrays.
3. **Subagent Delegation Pipeline**:
    - For broad research or noisy exploration, Claude Code forks isolated subagents with specialized read-only tools. Subagents complete their investigation and return only a synthesized markdown brief, keeping the parent agent's context clean.
4. **Project Memory (`CLAUDE.md`)**:
    - Reads workspace-level build instructions, style guides, and testing protocols from `CLAUDE.md` / `AGENTS.md`, establishing persistent human-to-agent alignment.

---

### 2.3 OpenAI Codex & SWE Architectures

OpenAI's foundational work with Codex (Chen et al., 2021) and the subsequent SWE-bench benchmark (Jimenez et al., 2023) established that **execution-grounded validation is the only reliable metric of code agent capability**:

1. **Agent-Computer Interfaces (ACI)**: SWE-agent (Yang et al., 2024) proved that standard bash shells are suboptimal for LLMs. LLMs require specialized ACIs: viewing windows with line numbers, surgical search-and-replace tools with linting feedback, and deterministic file navigation.
2. **Test-Driven Evaluation**: Codex and SWE architectures operate on the principle that code generated without execution verification has an exponential failure rate over multi-file edits.
3. **Differential State Inspection**: Every modification is evaluated as a `git diff` against the base tree, allowing the harness to verify that only intended files were altered and no accidental deletions occurred.

---

## 3. Theoretical Foundations of Self-Learning Agent Systems

To make December self-learning and growing, we synthesize foundational mechanisms from peer-reviewed AI research:

```
+---------------------------------------------------------------------------------------------------+
|                            THEORETICAL FOUNDATIONS TAXONOMY                                       |
+--------------------+---------------------------+--------------------------------------------------+
| Paradigm           | Primary Citation          | Core Mechanism Applied to December Coding Agent  |
+--------------------+---------------------------+--------------------------------------------------+
| Skill Library      | Voyager (Wang et al.,     | Autonomous authoring, validation, and storage    |
| & Curriculum       | 2023)                     | of executable TypeScript tools in .december/     |
+--------------------+---------------------------+--------------------------------------------------+
| Verbal RL &        | Reflexion (Shinn et al.,  | Post-mortem error analysis generating linguistic |
| Self-Reflection    | 2023)                     | memory buffers without modifying model weights.  |
+--------------------+---------------------------+--------------------------------------------------+
| Cross-Task         | ExpeL (Zhao et al.,       | Extracting abstract coding rules and heuristics  |
| Rule Extraction    | 2023)                     | from multi-session successes/failures.           |
+--------------------+---------------------------+--------------------------------------------------+
| Tool Maker /       | LATM (Cai et al.,         | High-capability model authors complex tools;     |
| Tool User Split    | 2023)                     | runtime agent invokes them with minimal overhead.|
+--------------------+---------------------------+--------------------------------------------------+
| Self-Taught        | STaR (Zelikman et al.,    | Verification-filtered trajectory distillation for|
| Distillation       | 2022) / DPO / GRPO        | SFT and DPO offline fine-tuning loops.           |
+--------------------+---------------------------+--------------------------------------------------+
```

### 3.1 Voyager: The Ever-Expanding Skill Library

Wang et al. (2023) demonstrated in _Voyager_ that an embodied agent achieves open-ended mastery through three components:

1. **Iterative Prompting with Compiler Feedback**: When code fails, the agent receives the exact exception traceback and revises the code in a closed loop.
2. **Skill Library as Executable Programs**: Successful subroutines are wrapped into self-contained functions, annotated with docstrings, indexed via vector embeddings, and saved to disk.
3. **Dynamic Skill Retrieval**: For new tasks, the agent queries the skill library, retrieving top-$k$ relevant skill programs and injecting them as available tools.

### 3.2 Reflexion: Verbal Reinforcement Learning

Shinn et al. (2023) showed that language agents can learn from errors without gradient updates:

- When an execution trajectory fails (e.g., test suite fails, build breaks), a **Reflector model** analyzes:
  $$\text{Reflection} = f(\text{Task}, \text{Trajectory}, \text{Execution Error})$$
- The output is an explicit verbal heuristic (e.g., _"When editing Prisma schema migrations in packages/database, must run `bun db:migrate:test` before executing Jest suites"_).
- This reflection is stored in an episodic memory buffer and prepended to the context in future attempts.

### 3.3 ExpeL: Experiential Learning Across Tasks

Zhao et al. (2023) formalized cross-task learning:

- Rather than storing raw episodic memories, an **Insight Extraction Engine** compares pairwise trajectories (Success vs. Failure) across multiple tasks.
- It distills domain-general rules into a structured **Rulebook**. During subsequent tasks, the agent retrieves only the relevant rules, preventing context bloat while retaining learned wisdom.

### 3.4 LATM: LLMs as Tool Makers

Cai et al. (2023) separated the labor of tool creation and tool execution:

- **Tool Maker**: A frontier model (e.g., Claude 3.7 Sonnet, GPT-4.5) analyzes repetitive sub-problems and designs robust, reusable utility scripts with error handling and validation tests.
- **Tool User**: A faster, cost-effective model (or local model) invokes the newly synthesized tool via standard schemas.

---

## 4. Why Coding is the Ultimate Domain for Self-Learning Agents

Unlike open-ended creative writing or unstructured dialogue, **software engineering provides an objective, deterministic ground-truth verification harness**:

$$
\text{Reward}(S, A) = \begin{cases}
1.0 & \text{if } \text{ExitCode}(A) = 0 \land \text{TypeCheck}(S') = \text{PASS} \land \text{Tests}(S') = \text{PASS} \land \Delta\text{Git}(S') \subseteq \text{Scope} \\
-1.0 & \text{if } \text{SyntaxError}(S') \lor \text{TypeCheck}(S') = \text{FAIL} \lor \text{Tests}(S') = \text{FAIL} \\
0.0 & \text{otherwise}
\end{cases}
$$

1. **Sub-Second Deterministic Feedback**: Compilers (TypeScript, Rust, Go), linters (ESLint, Biome), and test runners (Bun test, Vitest, Jest) provide exact line numbers, error codes, and failure descriptions.
2. **Zero-Ambiguity Success Metrics**: A task is empirically solved only when the reproduction test passes without regressing existing test suites.
3. **Atomic Rollbacks via Git**: The agent harness can maintain a clean checkpoint tree. If an exploration path fails, the harness executes `git checkout -- .` and passes the failure diagnosis to the Reflexion engine.

---

## 5. Architectural Specification: December's Self-Learning & Growing Harness

To implement this vision in December, we design a 4-pillar architectural system that integrates directly into the existing repository structure:

```
                                  DECEMBER AGENT HARNESS LIFECYCLE

    +------------------------------------------------------------------------------------+
    | 1. INITIALIZATION & CONTEXT INGESTION                                              |
    |    - Static Base System Prompt (KV Cached)                                         |
    |    - Discovered Rules (.december/rules.md + AGENTS.md)                             |
    |    - Dynamically Retrieved Skills (.december/skills/*.ts)                          |
    |    - Active Episodic Memory / Error Signatures (Prisma DB / Cache)                 |
    +-----------------------------------------+------------------------------------------+
                                              |
                                              v
    +------------------------------------------------------------------------------------+
    | 2. AGENT INNER LOOP EXECUTION (agent-loop.ts)                                      |
    |    - XML / JSON Tool Call Dispatch                                                 |
    |    - Surgical Editing (edit_file / edit_diff / fuzzy_patch)                        |
    |    - Stale Tool Output Evaporation & Context Compaction                            |
    +-----------------------------------------+------------------------------------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
                        v [On Tool / Command Execution]             v [On Turn Failure / Error]
    +-----------------------------------------+   +------------------------------------------+
    | 3. VERIFICATION & GROUND-TRUTH ENGINE   |   | 4. EXPERIENTIAL LEARNING & REFLEXION     |
    |    - Pre-flight AST Syntax Checking     |   |    - Error Signature Extraction          |
    |    - In-Sandbox Test Execution (E2B)    |   |    - Reflexion Self-Analysis             |
    |    - Differential Git Safety Boundaries |   |    - Rule Synthesis -> .december/rules.md|
    +-----------------------------------------+   +------------------------------------------+
                        |                                           |
                        +---------------------+---------------------+
                                              |
                                              v [On Multi-Turn Repetition / Pattern Detected]
    +------------------------------------------------------------------------------------+
    | 5. AUTONOMOUS SKILL SYNTHESIS (Voyager / LATM Engine)                             |
    |    - Synthesize TypeScript Tool (.december/skills/<name>.ts)                       |
    |    - Generate & Execute Unit Test in Worker Sandbox                                |
    |    - Hot-Reload into Agent McpClientPool / Tool Registry                           |
    +-----------------------------------------+------------------------------------------+
                                              |
                                              v [On Session Completion / Verification Pass]
    +------------------------------------------------------------------------------------+
    | 6. TRAJECTORY DISTILLATION FLYWHEEL                                                |
    |    - Langfuse / Database Telemetry Filter (Verify Ground Truth Pass)               |
    |    - Curate SFT (Chain-of-Thought + Tool Calls) & DPO Pairs (Passing vs Failing)   |
    |    - Trigger Worker Fine-Tuning Pipeline for Local Models / LoRA Adapters          |
    +------------------------------------------------------------------------------------+
```

---

### 5.1 Pillar 1: In-Context Experiential Learning & Dynamic Rule Evolution

#### The Reflexion Loop in December

When a tool execution or test run fails during the inner loop in `packages/agent/src/agent-loop.ts`, the harness intercepts the error before returning to the model:

1. **Error Signature Generation**: Computes a normalized hash of the error type, offending file path, and stack trace signature.
2. **Reflexion Prompting**: A lightweight reflection pass is executed:

    ```typescript
    export interface ReflexionInput {
        taskDescription: string
        attemptedAction: ToolCall
        errorMessage: string
        stackTrace?: string
        workspaceRules: string[]
    }

    export interface ReflexionOutput {
        diagnosis: string
        rootCause: string
        preventativeHeuristic: string
        suggestedNextAction: string
    }
    ```

3. **Episodic Memory Buffer**: The `preventativeHeuristic` is added to `AgentSessionMemory` (in `packages/database/prisma/schema.prisma`) and injected into the immediate agent context as a high-priority `<reflection>` tag.

#### Dynamic Rule Evolution & Synthesis (ExpeL Engine)

At the end of a session, or when a reflection pattern repeats $\ge 2$ times across sessions:

1. **Rule Synthesis Engine**: Evaluates the accumulated reflections across sessions for a given repository.
2. **Deduplication & Conflict Resolution**: Checks existing `.december/rules.md` and `AGENTS.md` to prevent duplicate or conflicting instructions.
3. **Automated Rule Persistence**: Appends the new structured rule to `.december/rules.md`:
    ```markdown
    <!-- .december/rules.md - Auto-synthesized rule -->

    ### [Rule-Auto-20260903] Monorepo Prisma Migrations

    - **Context**: When modifying `packages/database/prisma/schema.prisma`
    - **Trigger**: Prisma client schema out of sync during integration tests
    - **Mandatory Action**: Always execute `bun --cwd packages/database db:migrate:test` prior to running test suites.
    - **Confidence Score**: 0.94 (Verified across 4 successful runs)
    ```

---

### 5.2 Pillar 2: Autonomous Tool & Skill Synthesis (Voyager / LATM Engine)

When the agent repeatedly executes complex multi-step bash pipelines or specialized AST refactorings, it can autonomously synthesize a new, permanent skill.

```
+---------------------------------------------------------------------------------------------------+
|                                 SKILL SYNTHESIS PIPELINE                                          |
|                                                                                                   |
|  [Pattern Detected]  -->  [Generate Skill Code]  -->  [Sandbox Unit Test]  -->  [Skill Promotion]  |
|  (Multi-step Bash)        (TypeScript / Zod)          (E2B / Local VM)          (.december/skills)|
+---------------------------------------------------------------------------------------------------+
```

#### The Skill Lifecycle & Schema

Skills in December are self-contained TypeScript files conforming to the December Tool interface:

```typescript
// .december/skills/find-circular-deps.ts
import { z } from 'zod'
import type { Tool, ToolContext, ToolResult } from '@december/shared'

export const schema = z.object({
    entrypoint: z.string().describe('Root file or package directory to inspect'),
    maxDepth: z.number().optional().default(10).describe('Maximum search depth'),
})

export const metadata = {
    name: 'find_circular_deps',
    description: 'Fast AST-based circular dependency analyzer for TypeScript monorepos',
    version: '1.0.0',
    synthesizedBy: 'december-skill-maker-v1',
    createdAt: '2026-09-03T10:55:00Z',
}

export async function execute(args: z.infer<typeof schema>, ctx: ToolContext): Promise<ToolResult> {
    const { entrypoint, maxDepth } = args
    const result = await ctx.operations.exec(`bun x dpdm --circular ${entrypoint}`)
    if (result.exitCode !== 0) {
        return { success: false, error: result.stderr }
    }
    return { success: true, data: result.stdout }
}
```

#### The 4-Stage Skill Promotion Protocol

1. **Authoring**: The agent writes the proposed skill code and an accompanying unit test file into `.december/skills/staging/`.
2. **Sandbox Validation**: The harness runs the unit test inside an isolated worker container (`apps/worker/src/e2b-sandbox.service.ts`). The test must pass with exit code 0 and comply with timeout and memory limits.
3. **Security & Boundary Analysis**: An automated static analysis check ensures the skill does not touch forbidden paths outside the workspace boundary (`/etc`, `~/.ssh`).
4. **Hot-Reloading**: The skill is moved to `.december/skills/` and immediately registered into `AgentHarness.initMCP()` / `McpClientPool`, making it instantly callable in subsequent turns without restarting the agent.

---

### 5.3 Pillar 3: Ground-Truth Verification & Feedback Engine

A coding agent must never operate on assumption. December embeds deterministic verification at every stage of the execution loop:

```
                     +---------------------------------------+
                     | Agent Generates File Edit / Code      |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     | Phase 1: Pre-Flight AST Linter Check  |
                     | (TypeScript AST Parser / ESLint)      |
                     +-------------------+-------------------+
                                         | [Syntax Valid]
                                         v
                     +---------------------------------------+
                     | Phase 2: In-Sandbox TDD Execution     |
                     | (Run Targeted Unit / Integration Test)|
                     +-------------------+-------------------+
                                         | [Tests Pass]
                                         v
                     +---------------------------------------+
                     | Phase 3: Differential Git Validation  |
                     | (Inspect git diff --stat & scope)     |
                     +-------------------+-------------------+
                                         | [Scope Compliant]
                                         v
                     +---------------------------------------+
                     | Commit State / Mark Turn Complete     |
                     +-------------------+-------------------+
```

#### 1. Pre-Flight AST & Linting Verification

Before writing modified code to disk via `edit_file` or `edit_diff`, the tool runner runs an in-memory syntax and AST validation pass:

- If the replacement introduces an unmatched brace, unclosed tag, or invalid syntax, the tool call fails immediately with the exact line/column syntax error **without corrupting the on-disk file**.

#### 2. Autonomous Test Synthesis (TDD Loop)

When tasked with fixing a bug or implementing a new feature:

- The harness requires the agent to first generate a **reproduction test** (`*.test.ts`) that fails against current code.
- Once the code edit is applied, the test suite is executed inside the sandbox.
- Only when the reproduction test transitions from `FAIL -> PASS` (with 0 regressions in existing tests) is the task verified.

#### 3. Differential Git Boundaries

- Before each turn, the harness records `git rev-parse HEAD` and `git status --porcelain`.
- Post-turn, it computes `git diff --name-only`. If the agent modified files outside the declared scope or deleted critical test files, the harness blocks the turn and triggers a corrective steering prompt.

---

### 5.4 Pillar 4: Trajectory Distillation & Fine-Tuning Flywheel

The ultimate stage of agent growth is **closing the loop between online interaction trajectories and offline model weights**:

```
+---------------------------------------------------------------------------------------------------+
|                              TRAJECTORY DISTILLATION FLYWHEEL                                     |
|                                                                                                   |
|   +---------------------+        +----------------------+        +-----------------------+        |
|   | 1. Full Trajectory  | -----> | 2. Ground-Truth      | -----> | 3. Dataset Curation   |        |
|   | Logging (Langfuse)  |        | Execution Filter     |        | Pipeline (SFT & DPO)  |        |
|   +---------------------+        +----------------------+        +-----------+-----------+        |
|                                                                              |                    |
|                                                                              v                    |
|   +---------------------+        +----------------------+        +-----------------------+        |
|   | 6. Hot-Reload Local | <----- | 5. Local LoRA / QLoRA| <----- | 4. Distributed Worker |        |
|   | Adapter into Agent  |        | Fine-Tuning Job      |        | Training Pipeline     |        |
|   +---------------------+        +----------------------+        +-----------------------+        |
+---------------------------------------------------------------------------------------------------+
```

#### Step 1: Trajectory Telemetry Capture

Using December's telemetry module (`packages/agent/src/telemetry/langfuse-tracer.ts`), every session records:

- System prompt, rules, and skill definitions.
- Step-by-step `<thought>` monologues.
- Exact tool calls and formatted arguments.
- Real environment outputs (stdout, stderr, exit codes).
- User feedback and corrections.

#### Step 2: Ground-Truth Verification Filter

Trajectories are automatically scored and labeled:

- **GOLD (Positive Trajectory)**: All reproduction and regression tests passed, TypeScript compiler passed with zero errors, git diff strictly within scope, user accepted change.
- **SILVER (Self-Corrected Trajectory)**: Agent encountered errors during intermediate turns, executed Reflexion, self-corrected, and ultimately achieved all passing tests.
- **REJECTED (Negative Trajectory)**: Session aborted, tests unresolved, or manual user intervention required.

#### Step 3: Dataset Generation (SFT & DPO)

1. **Supervised Fine-Tuning (SFT) Dataset**:
    - Extracted from **GOLD** and successful branches of **SILVER** trajectories.
    - Formatted in Hermes-compatible XML/tool-calling schemas:
        ```json
        {
            "conversations": [
                { "role": "system", "content": "<system_prompt>...</system_prompt>" },
                { "role": "user", "content": "Fix the migration error in packages/database" },
                {
                    "role": "assistant",
                    "content": "<thought>The error indicates test db migrations are out of sync. I must run the test migration script.</thought><tool_call>{\"name\": \"bash\", \"arguments\": {\"command\": \"bun --cwd packages/database db:migrate:test\"}}</tool_call>"
                },
                {
                    "role": "tool",
                    "content": "<tool_response>{\"exitCode\": 0, \"stdout\": \"Migrations deployed.\"}</tool_response>"
                },
                {
                    "role": "assistant",
                    "content": "<thought>Migrations succeeded. Now running integration tests to verify.</thought><tool_call>{\"name\": \"bash\", \"arguments\": {\"command\": \"bun test packages/database/test/integration\"}}</tool_call>"
                }
            ]
        }
        ```
2. **Direct Preference Optimization (DPO / GRPO) Dataset**:
    - Constructed directly from **SILVER** trajectory divergence points:
        - **Prompt ($x$)**: State preceding the error.
        - **Rejected ($y_w$)**: The failing tool call / hallucinated fix that triggered compiler/test errors.
        - **Chosen ($y_l$)**: The subsequent self-corrected tool call that satisfied ground-truth verification.

#### Step 4: Continual LoRA / Model Fine-Tuning

- Using an asynchronous queue in `apps/worker`, periodic jobs fine-tune local open-weights coding models (e.g., Qwen 2.5 Coder 7B/32B, Llama 3.3 70B, or Hermes 3 adapters).
- The fine-tuned weights are deployed as specialized local inference endpoints (via Ollama, vLLM, or OpenRouter), giving December higher execution velocity, zero token cost for routine tasks, and immunity to third-party API deprecations.

---

## 6. Implementation Blueprint & Module Mapping for December

We specify the exact architectural modifications and new modules across December's packages:

```
december/
├── packages/
│   ├── agent/
│   │   └── src/
│   │       ├── learning/                    <-- NEW: Experiential Learning Module
│   │       │   ├── reflexion-engine.ts      <-- Verbal RL & Failure Analysis
│   │       │   ├── rule-evolution.ts        <-- ExpeL Cross-Session Rule Synthesis
│   │       │   ├── skill-synthesizer.ts     <-- Voyager/LATM Tool Generation
│   │       │   └── types.ts                 <-- Learning interfaces
│   │       ├── harness/
│   │       │   ├── agent-harness.ts         <-- Enhanced to dynamic skill/rule discovery
│   │       │   └── verification-pipeline.ts <-- NEW: Pre/Post-Flight Verification
│   │       └── agent-loop.ts                <-- Integrated with Reflexion & Verification
│   ├── database/
│   │   └── prisma/
│   │       └── schema.prisma                <-- NEW: Extended models for Skills & Rules
│   └── tools/
│       └── src/
│           ├── synthesize_skill.ts          <-- NEW: Agent tool to author new tools
│           └── reflect_and_learn.ts         <-- NEW: Agent tool for manual reflection
└── apps/
    └── worker/
        └── src/
            ├── distillation/                <-- NEW: Trajectory Curation & Training Worker
            │   ├── trajectory-filter.ts
            │   └── dataset-builder.ts
            └── skill-sandbox.ts             <-- Isolated validation container
```

---

### 6.1 Database Schema Extensions (`packages/database/prisma/schema.prisma`)

We add dedicated models for persistent skills, dynamic rules, and curated trajectories:

```prisma
// Extended Prisma Schema for Self-Learning Harness

model AgentSkill {
  id          String   @id @default(uuid())
  name        String   @unique
  description String
  code        String   // TypeScript source code
  schema      Json     // Zod schema definition
  version     String   @default("1.0.0")
  isVerified  Boolean  @default(false)
  testSuite   String?  // Executable unit test
  successRate Float    @default(1.0)
  callCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@index([isVerified])
}

model LearnedRule {
  id              String   @id @default(uuid())
  contextPattern  String   // Regex / glob pattern for file or task type
  triggerCondition String  // Description of error or trigger
  ruleContent     String   // Specific actionable instruction
  confidence      Float    @default(0.5)
  occurrences     Int      @default(1)
  isApproved      Boolean  @default(false)
  sourceSessionId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([contextPattern])
}

model TrajectoryTrace {
  id              String   @id @default(uuid())
  sessionId       String
  taskPrompt      String
  turnCount       Int
  isSuccess       Boolean
  testPassed      Boolean  @default(false)
  typeCheckPassed Boolean  @default(false)
  gitDiffSummary  String?
  traceData       Json     // Full multi-turn conversation with <thought> and tools
  curatedForSft   Boolean  @default(false)
  curatedForDpo   Boolean  @default(false)
  createdAt       DateTime @default(now())

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@index([sessionId])
  @@index([isSuccess, testPassed])
}
```

---

### 6.2 Reflexion Engine Implementation (`packages/agent/src/learning/reflexion-engine.ts`)

```typescript
import type { ToolCall, ToolResult } from '@december/shared'
import type { LLMProvider } from '@december/providers'

export interface FailureContext {
    task: string
    toolCall: ToolCall
    toolResult: ToolResult
    recentThoughts: string
}

export interface ReflectionAnalysis {
    rootCause: string
    mistakeCategory:
        | 'HALLUCINATED_API'
        | 'SYNTAX_ERROR'
        | 'MISSING_DEPENDENCY'
        | 'ENVIRONMENT_MISCONFIG'
        | 'LOGIC_FLAW'
    actionableGuideline: string
    retryStrategy: string
}

export class ReflexionEngine {
    private llm: LLMProvider

    constructor(llm: LLMProvider) {
        this.llm = llm
    }

    public async generateReflection(context: FailureContext): Promise<ReflectionAnalysis> {
        const prompt = `You are the Reflexion Diagnostic Subsystem for an expert autonomous coding agent.
A tool execution has failed. Analyze the failure with extreme technical rigor.

### TASK:
${context.task}

### RECENT AGENT REASONING:
${context.recentThoughts}

### FAILED ACTION:
Tool: ${context.toolCall.name}
Arguments: ${JSON.stringify(context.toolCall.arguments, null, 2)}

### EXECUTION ERROR / OUTPUT:
${context.toolResult.error || context.toolResult.data}

Formulate an in-depth diagnosis. Return your response as a valid JSON object matching this schema:
{
  "rootCause": "Detailed explanation of why the action failed",
  "mistakeCategory": "HALLUCINATED_API | SYNTAX_ERROR | MISSING_DEPENDENCY | ENVIRONMENT_MISCONFIG | LOGIC_FLAW",
  "actionableGuideline": "Clear, concise imperative rule to prevent this specific failure in future turns",
  "retryStrategy": "Concrete immediate next action to take"
}`

        const response = await this.llm.chat({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            responseFormat: { type: 'json_object' },
        })

        try {
            return JSON.parse(response.content) as ReflectionAnalysis
        } catch {
            return {
                rootCause: 'Failed to parse structured reflection',
                mistakeCategory: 'LOGIC_FLAW',
                actionableGuideline:
                    'Carefully verify tool arguments and environment logs before re-executing.',
                retryStrategy: 'Inspect full error logs.',
            }
        }
    }
}
```

---

### 6.3 Skill Synthesizer Implementation (`packages/agent/src/learning/skill-synthesizer.ts`)

```typescript
import fs from 'node:fs/promises'
import path from 'node:path'
import type { PlatformAdapter } from '../platform-adapter'

export interface SynthesizedSkillSpec {
    name: string
    description: string
    typescriptCode: string
    unitTestCode: string
    schemaDefinition: Record<string, any>
}

export class SkillSynthesizer {
    private workspaceDir: string
    private operations: PlatformAdapter

    constructor(workspaceDir: string, operations: PlatformAdapter) {
        this.workspaceDir = workspaceDir
        this.operations = operations
    }

    public async stageSkill(
        spec: SynthesizedSkillSpec
    ): Promise<{ success: boolean; error?: string }> {
        const skillsDir = path.join(this.workspaceDir, '.december', 'skills')
        const stagingDir = path.join(skillsDir, 'staging')
        await fs.mkdir(stagingDir, { recursive: true })

        const skillPath = path.join(stagingDir, `${spec.name}.ts`)
        const testPath = path.join(stagingDir, `${spec.name}.test.ts`)

        await fs.writeFile(skillPath, spec.typescriptCode, 'utf8')
        await fs.writeFile(testPath, spec.unitTestCode, 'utf8')

        // Run validation test in sandbox
        const testResult = await this.operations.exec(`bun test ${testPath}`)
        if (testResult.exitCode !== 0) {
            await fs.rm(skillPath).catch(() => {})
            await fs.rm(testPath).catch(() => {})
            return {
                success: false,
                error: `Skill unit tests failed validation:\n${testResult.stderr || testResult.stdout}`,
            }
        }

        // Promote from staging to active skills directory
        const activePath = path.join(skillsDir, `${spec.name}.ts`)
        await fs.rename(skillPath, activePath)
        await fs.rm(testPath).catch(() => {})

        return { success: true }
    }
}
```

---

## 7. Safety, Governance, and Anti-Degradation Guardrails

Uncontrolled self-learning agents risk **runaway rule degradation, hallucinated tool accumulation, and prompt bloat**. December establishes four non-negotiable governance guardrails:

```
+---------------------------------------------------------------------------------------------------+
|                                 SAFETY & GOVERNANCE GUARDRAILS                                    |
+---------------------+-----------------------------------+-----------------------------------------+
| Threat              | Vulnerability Mechanism           | December Mitigation Guardrail           |
+---------------------+-----------------------------------+-----------------------------------------+
| Rule Poisoning /    | Bad reflection from one-off edge  | Rules require $\ge 2$ cross-session       |
| Hallucination       | case becomes permanent global rule| verification occurrences + confidence   |
|                     |                                   | scoring $\ge 0.85$ before auto-promotion.|
+---------------------+-----------------------------------+-----------------------------------------+
| Workspace Escape /  | Self-authored tool tries to touch | Strict filesystem isolation; tools run  |
| Privilege Escalation| system paths (/etc, ~/.ssh)       | inside sandboxed worker containers with |
|                     |                                   | non-root UID and restricted namespaces. |
+---------------------+-----------------------------------+-----------------------------------------+
| Context Saturation  | Accumulated skills consume entire | Skills are indexed dynamically in vector|
| from Skill Bloat    | system prompt context window      | memory; only top-$k$ relevant skills are|
|                     |                                   | injected based on current task cosine.  |
+---------------------+-----------------------------------+-----------------------------------------+
| Catastrophic Model  | Fine-tuning on bad trajectories   | Distillation pipeline enforces STRICT   |
| Degradation (LoRA)  | corrupts model reasoning abilities| ground-truth gating: 100% test pass +   |
|                     |                                   | automated AST linter pass required.     |
+---------------------+-----------------------------------+-----------------------------------------+
```

---

## 8. Detailed Execution Walkthrough: An Autonomous Growth Cycle

To visualize how these systems interact in real time, consider a concrete scenario:

1. **User Request**: _"Migrate our session authentication from JWT to server-backed Redis sessions and ensure all integration tests pass."_
2. **Turn 1 (Attempt)**: December reads the existing auth routes, implements a Redis session store in `packages/server`, and executes `bun test packages/server/test/auth.integration.test.ts`.
3. **Failure Interception**: The test runner fails because the local test environment has no active Redis daemon running on port 6379.
4. **Reflexion Engine Activation**:
    - Error signature recognized: `ECONNREFUSED 127.0.0.1:6379`.
    - Reflexion diagnosis: _"Integration tests requiring Redis require spinning up an in-memory mock or starting the docker-compose test container prior to test execution."_
    - Immediate retry heuristic injected into `<reflection>` buffer.
5. **Turn 2 (Self-Correction)**:
    - December executes `docker compose up -d redis-test` via `bash` tool.
    - Re-runs integration tests: **ALL 14 TESTS PASS**.
6. **Rule Synthesis**:
    - The engine recognizes this is the 3rd time a Redis connection error occurred during server integration testing.
    - Synthesizes and writes new rule to `.december/rules.md`:
      `When running apps/server integration tests, verify Redis container state via docker compose up -d redis-test.`
7. **Skill Synthesis Trigger**:
    - The multi-command sequence (`check container status -> start container if absent -> wait for healthy ping -> run test`) is synthesized into a dedicated tool: `verify_redis_test_env`.
    - The tool is tested in staging, validated, and promoted to `.december/skills/verify_redis_test_env.ts`.
8. **Trajectory Distillation**:
    - The session trace (Initial failure -> Reflexion -> Docker startup -> Test pass) is verified by the ground-truth filter as a valid **SILVER** trajectory.
    - Formatted into an SFT turn for the positive resolution and a DPO pair for the initial mistake, ready for the nightly fine-tuning run.

---

## 9. Primary Sources, References & Annotated Bibliography

### Primary Research Papers

1. **Voyager: An Open-Ended Embodied Agent with Large Language Models**  
   _Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, Anima Anandkumar_ (2023).  
   _arXiv:2305.16291_. [https://arxiv.org/abs/2305.16291](https://arxiv.org/abs/2305.16291)  
   _Contribution_: The 3-pillar lifelong learning framework (automatic curriculum, iterative prompting with environment feedback, ever-expanding executable skill library).

2. **Reflexion: Language Agents with Verbal Reinforcement Learning**  
   _Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao_ (2023).  
   _NeurIPS 2023 / arXiv:2303.11366_. [https://arxiv.org/abs/2303.11366](https://arxiv.org/abs/2303.11366)  
   _Contribution_: Demonstrating that verbal self-reflection stored in episodic memory achieves state-of-the-art problem solving on HumanEval (91.0% pass@1) without gradient updates.

3. **ExpeL: LLM Agents Are Experiential Learners**  
   _Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu Lin, Yong-Jin Liu, Gao Huang_ (2023).  
   _AAAI 2024 / arXiv:2308.10144_. [https://arxiv.org/abs/2308.10144](https://arxiv.org/abs/2308.10144)  
   _Contribution_: Cross-task experiential learning framework extracting abstract heuristics and structured rulebooks from successful and failed trial pairs.

4. **Large Language Models as Tool Makers (LATM)**  
   _Tianle Cai, Xuezhi Wang, Tengyu Ma, Xinyun Chen, Denny Zhou_ (2023).  
   _arXiv:2305.17126_. [https://arxiv.org/abs/2305.17126](https://arxiv.org/abs/2305.17126)  
   _Contribution_: The Tool Maker / Tool User paradigm separating the heavy computational cost of tool synthesis from lightweight tool execution.

5. **SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering**  
   _John Yang, Carlos E. Jimenez, Alexander Wettig, Kilian Lieret, Shunyu Yao, Karthik Narasimhan, Ofir Press_ (2024).  
   _NeurIPS 2024 / arXiv:2405.15793_. [https://arxiv.org/abs/2405.15793](https://arxiv.org/abs/2405.15793)  
   _Contribution_: Designing dedicated Agent-Computer Interfaces (linters, search-and-replace, file viewers) tailored specifically for language model affordances.

6. **SWE-bench: Can Language Models Resolve Real-World GitHub Issues?**  
   _Carlos E. Jimenez, John Yang, Alexander Wettig, Shunyu Yao, Kexin Pei, Ofir Press, Karthik Narasimhan_ (2023).  
   _ICLR 2024 / arXiv:2310.06770_. [https://arxiv.org/abs/2310.06770](https://arxiv.org/abs/2310.06770)  
   _Contribution_: The gold-standard benchmark for execution-based verification of software engineering agents against ground-truth unit tests.

7. **Evaluating Large Language Models Trained on Code (OpenAI Codex)**  
   _Mark Chen, Jerry Tworek, Heewoo Jun, Qiming Yuan, Henrique Ponde de Oliveira Pinto, et al._ (2021).  
   _arXiv:2107.03374_. [https://arxiv.org/abs/2107.03374](https://arxiv.org/abs/2107.03374)  
   _Contribution_: HumanEval benchmark and foundational analysis of execution-grounded code generation.

8. **STaR: Bootstrapping Reasoning With Reasoning**  
   _Eric Zelikman, Yuhuai Wu, Jesse Mu, Noah D. Goodman_ (2022).  
   _NeurIPS 2022 / arXiv:2203.14465_. [https://arxiv.org/abs/2203.14465](https://arxiv.org/abs/2203.14465)  
   _Contribution_: The self-taught reasoner flywheel generating rationale trajectories, filtering by answer ground truth, and fine-tuning.

### Technical Reports & Industry Architectures

9. **Hermes 3 Technical Report**  
   _Nous Research (Teknium, karan4d, ethanath, casper-hansen, intervitens, et al.)_ (August 2024).  
   [https://nousresearch.com/wp-content/uploads/2024/08/Hermes-3-Technical-Report.pdf](https://nousresearch.com/wp-content/uploads/2024/08/Hermes-3-Technical-Report.pdf)  
   _Key Findings_: XML structured reasoning tags (`<SCRATCHPAD>`, `<THINKING>`), standardized function calling schemas (`<tool_call>`), and open-weights steerability.

10. **Anthropic Claude Code Architecture & Documentation**  
    _Anthropic Research & Applied AI_ (2025).  
    [https://docs.anthropic.com/en/docs/agents-and-tools/claude-code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code)  
    _Key Findings_: Terminal harness design, prompt caching prefix optimization, compaction and tool evaporation strategies, and `CLAUDE.md` project memory.

---

## 10. Conclusion & Strategic Next Steps

By combining the **steerability, expressive tool-calling format, and synthetic data flywheel of the Hermes paradigm** with the **deterministic runtime verification, AST linting, and prompt-cached harness engineering of Claude Code**, December establishes an unmatched architectural blueprint for self-improving coding agents.

### Roadmap for Implementation

- [ ] **Phase 1: Reflexion & Error Signature Pipeline** (`packages/agent/src/learning/reflexion-engine.ts`)
- [ ] **Phase 2: Dynamic Rule Evolution Engine** (`packages/agent/src/learning/rule-evolution.ts` -> `.december/rules.md`)
- [ ] **Phase 3: Autonomous Skill Synthesizer & Staging Sandbox** (`packages/agent/src/learning/skill-synthesizer.ts` + `packages/tools/src/synthesize_skill.ts`)
- [ ] **Phase 4: Trajectory Telemetry & Ground-Truth Dataset Builder** (`apps/worker/src/distillation/`)
- [ ] **Phase 5: Automated LoRA Distillation Pipeline for Local Models** (Fine-tuning local Qwen/Hermes weights on verified trajectories)
