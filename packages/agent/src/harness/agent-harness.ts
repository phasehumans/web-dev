import fs from 'node:fs'
import path from 'node:path'

import { McpClientPool } from '@december/tools'

import { Agent } from '../agent'

import type { AgentConfig } from '../agent'
import type { Tool } from '@december/shared'
import type { McpConfigFile } from '@december/tools'

export const DEFAULT_BASE_SYSTEM_PROMPT = `You are December, an autonomous, expert coding agent. You help the user by exploring codebases, executing terminal commands, editing files, and resolving complex tasks.

You operate across two environments seamlessly: locally via a terminal CLI, and remotely via a secure cloud sandbox.

### Core Operating Principles & Guardrails
1. Inspect Logs & Stack Traces First: NEVER diagnose errors or failures without fetching and reading full un-truncated error logs. Base diagnoses strictly on empirical log evidence.
2. Root Cause Resolution: NEVER mask symptoms, swallow exceptions silently, use dummy fallbacks, or delete/comment out failing tests. Address the root cause directly.
3. Execution & Verification: NEVER claim a task or fix is complete without running build, type-check, or test verification commands to empirically prove it works.
4. Preserving Integrity: Always preserve existing docstrings, comments, and public API signatures unless explicitly asked to modify them.
5. Absolute File Paths: ALWAYS specify absolute file paths when referencing, viewing, or editing files.
6. Strict Workspace Boundary: All operations (file reads, writes, searches, bash commands) must be strictly confined within the workspace directory (/workspace or current working directory). NEVER inspect, explore, or search system root paths or directories outside the workspace (such as /etc, /root, /bin, /var).
7. No Raw Code In Chat: NEVER dump raw source code, full HTML/CSS/JS files, or large code snippets into conversational chat text responses. Always execute code creation, updates, and deletions exclusively through filesystem tools ('write_file', 'edit_file', 'edit_diff').
8. Surgical File Editing & Token Limits: NEVER use 'write_file' to rewrite or modify an existing file. For existing files, ALWAYS use 'edit_file' or 'edit_diff' with targeted search/replace chunks or unified diffs. Full-file overwrites with 'write_file' risk hitting model output token limits, causing truncation and JSON parsing failures, and wipe uncommitted changes. Use 'write_file' EXCLUSIVELY for creating brand new files, keeping them modular.

### Tool Selection & Guidelines
- Code & Symbol Search: Use 'grep_search' for exact matching of symbols, functions, types, and error strings across files rather than inspecting files one-by-one.
- File Discovery: Use 'find_files' with glob patterns (e.g. "**/*.ts") to locate target files efficiently within the workspace.
- File Modification: ALWAYS use 'edit_file' or 'edit_diff' when changing existing files to preserve untouched code and avoid token limits. Use 'write_file' EXCLUSIVELY for creating brand new files.
- Web & Docs: Use 'web_search' to fetch up-to-date framework docs, library APIs, or external stack traces.
- Async & Background Tasks: Use 'manage_task' to monitor, send input to, or stop background processes.

### Reasoning & Communication Protocol
- Thought Enclosure: Before calling any tool, you MUST enclose your step-by-step reasoning inside <thought>...</thought> tags.
- Conciseness & Chat Focus: Be direct and concise. In chat messages, provide ONLY high-level status updates, architectural decisions, and tool confirmations. Do not repeat file contents in chat.
- Execution Summary: At the end of your work, provide a concise summary (max 4-5 lines, single cohesive paragraph) highlighting key actions, modified files, and test verification results.`

export interface HarnessConfig extends Omit<AgentConfig, 'systemPrompt'> {
    baseSystemPrompt?: string
    workspaceDir: string
    mcpPool?: McpClientPool
    mcpConfig?: McpConfigFile
    skipMcp?: boolean
}

export class AgentHarness {
    private agent: Agent
    private config: HarnessConfig
    private mcpPool?: McpClientPool

    constructor(config: HarnessConfig) {
        this.config = config

        // 1. discover skills
        const skills = this.discoverSkills()

        const systemPrompt = config.baseSystemPrompt || DEFAULT_BASE_SYSTEM_PROMPT

        // 3. discover project rules
        const rules = this.discoverRules()

        // 4. assemble final system prompt: static prefix first (for KV prompt cache hits), dynamic metadata last
        let finalPrompt = `${systemPrompt}`

        if (skills.length > 0) {
            finalPrompt += `\n\nAvailable Skills:\n${skills.join('\n')}`
        }

        if (rules.length > 0) {
            finalPrompt += `\n\n<project_context>\nThe user has provided the following project-specific instructions and guidelines from their .december workspace:\n`
            for (const rule of rules) {
                finalPrompt += `<project_instructions path="${rule.path}">\n${rule.content}\n</project_instructions>\n`
            }
            finalPrompt += `</project_context>`
        }

        // Dynamic environment context placed at the end to keep static prefix identical for prompt caching
        finalPrompt += `\n\nCurrent date: ${new Date().toISOString().split('T')[0]}\nCurrent working directory: ${config.workspaceDir}`

        // 4. initialize core agent
        this.agent = new Agent({
            ...config,
            systemPrompt: finalPrompt,
        })

        // 5. attach mcp pool for local CLI runtime
        if (!config.skipMcp && config.runtime !== 'cloud') {
            this.mcpPool =
                config.mcpPool ||
                new McpClientPool({
                    workspaceDir: config.workspaceDir,
                    operations: config.operations,
                })
            this.agent.mcpPool = this.mcpPool
        }
    }

    public async initMCP(config?: McpConfigFile): Promise<Tool[]> {
        if (this.config.skipMcp || this.config.runtime === 'cloud' || !this.mcpPool) {
            return []
        }
        await this.mcpPool.initialize(config || this.config.mcpConfig)
        const tools = this.mcpPool.getTools()
        this.agent.syncMcpTools(tools)
        return tools
    }

    public async reloadMCP(config?: McpConfigFile): Promise<{ tools: Tool[]; serverInfos: any[] }> {
        if (this.config.skipMcp || this.config.runtime === 'cloud' || !this.mcpPool) {
            return { tools: [], serverInfos: [] }
        }
        const result = await this.mcpPool.reload(config)
        this.agent.syncMcpTools(result.tools)
        return result
    }

    public getMcpPool(): McpClientPool | undefined {
        return this.mcpPool
    }

    public static async create(config: HarnessConfig): Promise<AgentHarness> {
        const harness = new AgentHarness(config)
        if (!config.skipMcp) {
            await harness.initMCP(config.mcpConfig)
        }
        return harness
    }

    private discoverSkills(): string[] {
        const skills: string[] = []
        const skillsFile = path.join(this.config.workspaceDir, '.december', 'skills.md')

        try {
            if (fs.existsSync(skillsFile)) {
                const content = fs.readFileSync(skillsFile, 'utf8').trim()
                if (content) {
                    skills.push(content)
                }
            }
        } catch (e) {
            // ignore errors reading skills
        }
        return skills
    }

    private discoverRules(): { path: string; content: string }[] {
        const rules: { path: string; content: string }[] = []

        try {
            const candidateFiles = [
                path.join(this.config.workspaceDir, 'AGENTS.md'),
                path.join(this.config.workspaceDir, '.december', 'rules.md'),
                path.join(this.config.workspaceDir, '.december', 'AGENTS.md'),
            ]

            for (const rulePath of candidateFiles) {
                if (fs.existsSync(rulePath)) {
                    const content = fs.readFileSync(rulePath, 'utf8').trim()
                    if (content) {
                        rules.push({ path: rulePath, content })
                    }
                }
            }
        } catch (e) {
            // ignore errors reading rules
        }

        return rules
    }

    public getAgent(): Agent {
        return this.agent
    }
}
