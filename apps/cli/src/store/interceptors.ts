import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Agent } from '@december/agent'
import {
    classifyOperation,
    checkPathGuard,
    extractTargetPaths,
    isDestructiveCommand,
    SessionWhitelistStore,
} from '@december/shared'
import { generateUnifiedDiff } from '@december/tools'

import { loadConfig, saveConfig } from '../config'

export const globalSessionWhitelist = new SessionWhitelistStore()

async function computeToolCallDiff(toolCall: any): Promise<string | undefined> {
    if (toolCall.input?.diff) {
        return toolCall.input.diff
    }

    const targetPath =
        toolCall.input?.TargetFile ||
        toolCall.input?.AbsolutePath ||
        toolCall.input?.filePath ||
        toolCall.input?.path

    if (!targetPath) return undefined

    const cwd = process.cwd()
    const resolved = path.resolve(cwd, targetPath)
    const relative = path.relative(cwd, resolved)

    let oldContent = ''
    try {
        oldContent = await fs.readFile(resolved, 'utf-8')
    } catch {
        // Intentionally swallowed: file does not exist yet (new file creation)
    }

    if (toolCall.name === 'write_to_file' || toolCall.name === 'write') {
        const newContent = toolCall.input?.CodeContent ?? toolCall.input?.content ?? ''
        return generateUnifiedDiff(relative, oldContent, newContent)
    }

    if (toolCall.name === 'replace_file_content' || toolCall.name === 'edit') {
        const targetContent = toolCall.input?.TargetContent
        const replacementContent = toolCall.input?.ReplacementContent ?? ''
        if (targetContent && oldContent.includes(targetContent)) {
            const newContent = toolCall.input?.AllowMultiple
                ? oldContent.replaceAll(targetContent, replacementContent)
                : oldContent.replace(targetContent, replacementContent)
            return generateUnifiedDiff(relative, oldContent, newContent)
        }
    }

    if (toolCall.name === 'multi_replace_file_content') {
        const replacements = toolCall.input?.Replacements
        if (Array.isArray(replacements)) {
            let newContent = oldContent
            for (const rep of replacements) {
                if (rep.TargetContent) {
                    newContent = rep.AllowMultiple
                        ? newContent.replaceAll(rep.TargetContent, rep.ReplacementContent ?? '')
                        : newContent.replace(rep.TargetContent, rep.ReplacementContent ?? '')
                }
            }
            return generateUnifiedDiff(relative, oldContent, newContent)
        }
    }

    return undefined
}

export function setupAgentInterceptors(agent: Agent, storeState: any) {
    if (!agent.operations.ui) agent.operations.ui = {} as any

    agent.operations.ui.askQuestion = (questions) => {
        return new Promise((resolve) => {
            storeState.setAuthMode('ask_question')
            storeState.setPendingQuestions({ questions, resolve })
        })
    }

    agent.operations.ui.requestPermission = async (toolCall: any) => {
        const config = await loadConfig()

        // 1. PathGuard & Non-Workspace Access Checks
        const targetPaths = extractTargetPaths(toolCall)
        for (const targetPath of targetPaths) {
            if (config.pathGuard !== false) {
                const pg = checkPathGuard(targetPath)
                if (pg.isSystemBlocked) {
                    return {
                        block: true,
                        error: 'Access denied: PathGuard restricted system or credential path',
                    }
                }
                if (pg.isSecretAccess) {
                    toolCall.isSecretAccess = true
                }
            }

            const fileTools = [
                'view_file',
                'write_to_file',
                'replace_file_content',
                'multi_replace_file_content',
                'read_file',
                'edit_file',
                'edit_diff',
            ]
            if (fileTools.includes(toolCall.name)) {
                const cwd = process.cwd()
                const resolved = path.resolve(cwd, targetPath)
                const relative = path.relative(cwd, resolved)
                const isOutside = relative.startsWith('..') || path.isAbsolute(relative)
                if (!config.nonWorkspaceAccess && isOutside) {
                    return {
                        block: true,
                        error: 'Access denied: Non-workspace access is disabled in settings',
                    }
                }
            }
        }

        // 2. Check MCP auto-approval if the tool is a dynamic MCP tool
        if (toolCall.name?.includes('__')) {
            const [serverName, ...toolParts] = toolCall.name.split('__')
            const mcpToolName = toolParts.join('__')
            if (agent.mcpPool?.isAutoApproved(serverName, mcpToolName)) {
                return { block: false }
            }
        }

        // 3. Classify operation
        const classification = classifyOperation(toolCall)

        // Safe operations bypass UI prompts entirely, unless accessing secret files
        if (classification.tier === 'safe' && !toolCall.isSecretAccess) {
            return { block: false }
        }

        // Build command string for whitelist matching
        let cmdString = toolCall.name
        if (toolCall.name === 'run_command' || toolCall.name === 'bash') {
            cmdString = (toolCall.input?.CommandLine || toolCall.input?.command || toolCall.name)
                .toString()
                .trim()
        } else if (
            toolCall.input?.TargetFile ||
            toolCall.input?.path ||
            toolCall.input?.filePath ||
            toolCall.input?.AbsolutePath
        ) {
            const target =
                toolCall.input?.TargetFile ||
                toolCall.input?.path ||
                toolCall.input?.filePath ||
                toolCall.input?.AbsolutePath
            cmdString = `${toolCall.name}: ${target}`
        }

        // Modifying operations check always-proceed or session whitelist
        if (classification.tier === 'modifying' && !toolCall.isSecretAccess) {
            if ((config.toolPermission ?? 'always-proceed') === 'always-proceed')
                return { block: false }

            if (
                globalSessionWhitelist.isApproved(cmdString) ||
                globalSessionWhitelist.isApproved(toolCall.name) ||
                config.approvedTools?.includes(cmdString) ||
                config.approvedTools?.includes(toolCall.name) ||
                config.approvedTools?.some((pattern) => {
                    if (pattern.endsWith('*') && cmdString.startsWith(pattern.slice(0, -1))) {
                        return true
                    }
                    return false
                })
            ) {
                return { block: false }
            }
        }

        // 4. Interactive Confirmation Dialogue
        try {
            const diff = await computeToolCallDiff(toolCall)
            if (diff) {
                toolCall.diff = diff
            }
        } catch {
            // Intentionally swallowed: fallback to displaying toolSummary without diff preview
        }

        const result: any = await new Promise((resolve) => {
            storeState.setAuthMode('tool_permission')
            storeState.setPendingToolCall({ toolCall, resolve })
        })

        if (result?.block) {
            return { block: true, error: result.error || 'User denied permission' }
        }

        if (result?.allowAlways) {
            if (!isDestructiveCommand(cmdString)) {
                globalSessionWhitelist.add(cmdString)
                if (!config.approvedTools) config.approvedTools = []
                if (!config.approvedTools.includes(cmdString)) {
                    config.approvedTools.push(cmdString)
                }
                if (!config.approvedTools.includes(toolCall.name)) {
                    config.approvedTools.push(toolCall.name)
                }
                await saveConfig(config)
            }
            return { block: false }
        }

        if (result?.gitTrackedOnly) {
            const targetPath =
                toolCall.input?.TargetFile ||
                toolCall.input?.AbsolutePath ||
                toolCall.input?.filePath ||
                toolCall.input?.path
            if (targetPath) {
                const cwd = process.cwd()
                const resolved = path.resolve(cwd, targetPath)
                const relative = path.relative(cwd, resolved)
                try {
                    execSync(`git ls-files --error-unmatch "${relative}"`, {
                        cwd,
                        stdio: 'pipe',
                    })
                    return { block: false }
                } catch {
                    return {
                        block: true,
                        error: `Permission denied: ${relative} is not a git-tracked file.`,
                    }
                }
            }
        }

        return { block: false }
    }
}
