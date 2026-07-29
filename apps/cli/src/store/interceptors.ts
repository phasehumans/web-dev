import path from 'node:path'

import { Agent } from '@december/agent'

import { loadConfig } from '../config'

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
            'run_command',
        ]
        if (modifyingTools.includes(toolCall.name)) {
            let cmdString = toolCall.name
            if (toolCall.name === 'run_command') {
                cmdString = toolCall.input?.CommandLine || toolCall.name
            } else if (toolCall.input?.TargetFile) {
                cmdString = `${toolCall.name}: ${toolCall.input.TargetFile}`
            }

            if (config.approvedTools?.includes(cmdString)) {
                return { block: false }
            }

            return new Promise((resolve) => {
                storeState.setAuthMode('tool_permission')
                storeState.setPendingToolCall({ toolCall, resolve })
            })
        }
        return { block: false }
    }
}
