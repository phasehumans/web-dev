import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Agent } from '@december/agent'
import { generateUnifiedDiff } from '@december/tools'

import { loadConfig, saveConfig } from '../config'

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
        oldContent = ''
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

        const fileTools = [
            'view_file',
            'write_to_file',
            'replace_file_content',
            'multi_replace_file_content',
        ]
        if (fileTools.includes(toolCall.name)) {
            const targetPath =
                toolCall.input?.TargetFile ||
                toolCall.input?.AbsolutePath ||
                toolCall.input?.filePath ||
                toolCall.input?.path
            if (targetPath) {
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

        if (config.toolPermission === 'always-proceed') return { block: false }

        const modifyingTools = [
            'replace_file_content',
            'multi_replace_file_content',
            'write_to_file',
            'write',
            'edit_file',
            'edit_diff',
            'run_command',
            'bash',
        ]
        if (modifyingTools.includes(toolCall.name)) {
            let cmdString = toolCall.name
            if (toolCall.name === 'run_command' || toolCall.name === 'bash') {
                cmdString = toolCall.input?.CommandLine || toolCall.input?.command || toolCall.name
            } else if (
                toolCall.input?.TargetFile ||
                toolCall.input?.path ||
                toolCall.input?.filePath
            ) {
                const target =
                    toolCall.input?.TargetFile || toolCall.input?.path || toolCall.input?.filePath
                cmdString = `${toolCall.name}: ${target}`
            }

            if (
                config.approvedTools?.includes(cmdString) ||
                config.approvedTools?.includes(toolCall.name)
            ) {
                return { block: false }
            }

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
                if (!config.approvedTools) config.approvedTools = []
                if (!config.approvedTools.includes(cmdString)) {
                    config.approvedTools.push(cmdString)
                }
                if (!config.approvedTools.includes(toolCall.name)) {
                    config.approvedTools.push(toolCall.name)
                }
                await saveConfig(config)
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

        return { block: false }
    }
}
