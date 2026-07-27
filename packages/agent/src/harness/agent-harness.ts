import fs from 'node:fs'
import path from 'node:path'

import { Agent } from '../agent'

import type { AgentConfig } from '../agent'

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

        // 2. parse potential slash commands and adjust prompt
        const { systemPrompt } = this.parseSlashCommands(
            config.baseSystemPrompt ||
                `You are December, an autonomous, expert coding agent. You help the user by exploring codebases, executing terminal commands, editing files, and resolving complex tasks.

You operate across two environments seamlessly: locally via a terminal CLI, and remotely via a secure cloud sandbox.

Guidelines:
- Plan carefully before making broad changes.
- Use bash tools to explore the environment before guessing file paths.
- Be extremely concise in your responses. The user is a developer who values speed and exactness.
- ALWAYS show absolute file paths when viewing or editing files.
- Before using a tool, you MUST enclose your thought process inside <thought>...</thought> tags.
- At the end of your work, provide a summary of what you did, highlighting important keywords.`
        )

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

    private parseSlashCommands(prompt: string): { systemPrompt: string } {
        let finalPrompt = prompt
        finalPrompt += `\n\nSlash Commands Available:\n- /plan: Instructs the agent to output a detailed step-by-step plan before execution.\n- /schedule: Instructs the agent to configure a background timer or cron job.`
        return { systemPrompt: finalPrompt }
    }

    public getAgent(): Agent {
        return this.agent
    }
}
