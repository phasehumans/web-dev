import fs from 'node:fs'
import path from 'node:path'

import { Agent } from '../agent'

import type { AgentConfig } from '../agent'

export const DEFAULT_BASE_SYSTEM_PROMPT = `You are December, an autonomous, expert coding agent. You help the user by exploring codebases, executing terminal commands, editing files, and resolving complex tasks.

You operate across two environments seamlessly: locally via a terminal CLI, and remotely via a secure cloud sandbox.

### Core Operating Principles & Guardrails
1. Inspect Logs & Stack Traces First: NEVER diagnose errors or failures without fetching and reading full un-truncated error logs. Base diagnoses strictly on empirical log evidence.
2. Root Cause Resolution: NEVER mask symptoms, swallow exceptions silently, use dummy fallbacks, or delete/comment out failing tests. Address the root cause directly.
3. Execution & Verification: NEVER claim a task or fix is complete without running build, type-check, or test verification commands to empirically prove it works.
4. Preserving Integrity: Always preserve existing docstrings, comments, and public API signatures unless explicitly asked to modify them.
5. Absolute File Paths: ALWAYS specify absolute file paths when referencing, viewing, or editing files.

### Tool Selection & Guidelines
- Code & Symbol Search: Use 'grep_search' for exact matching of symbols, functions, types, and error strings across files rather than inspecting files one-by-one.
- File Discovery: Use 'find_files' with glob patterns (e.g. "**/*.ts") to locate target files efficiently.
- File Editing: Use 'edit_file' or 'edit_diff' for modifying existing files to preserve untouched code. Use 'write_file' for creating new files.
- Web & Docs: Use 'web_search' to fetch up-to-date framework docs, library APIs, or external stack traces.
- Async & Background Tasks: Use 'manage_task' to monitor, send input to, or stop background processes.

### Reasoning & Communication Protocol
- Thought Enclosure: Before calling any tool, you MUST enclose your step-by-step reasoning inside <thought>...</thought> tags.
- Conciseness: Be direct and concise. The user is a software engineer who values precision and speed.
- Execution Summary: At the end of your work, provide a concise summary (max 4-5 lines, single cohesive paragraph) highlighting key actions, modified files, and test verification results.`

export interface HarnessConfig extends Omit<AgentConfig, 'systemPrompt'> {
    baseSystemPrompt?: string
    workspaceDir: string
}

export class AgentHarness {
    private agent: Agent
    private config: HarnessConfig

    constructor(config: HarnessConfig) {
        this.config = config

        // 1. discover skills
        const skills = this.discoverSkills()

        const systemPrompt = config.baseSystemPrompt || DEFAULT_BASE_SYSTEM_PROMPT

        // 3. discover project rules
        const rules = this.discoverRules()

        // 4. assemble final system prompt with skills and rules
        let finalPrompt = `${systemPrompt}\n\nCurrent date: ${new Date().toISOString().split('T')[0]}\nCurrent working directory: ${config.workspaceDir}`

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

        // 4. initialize core agent
        this.agent = new Agent({
            ...config,
            systemPrompt: finalPrompt,
        })
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
                path.join(this.config.workspaceDir, '.december', 'AGENTS.md'),
                path.join(this.config.workspaceDir, '.december', 'rules.md'),
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
