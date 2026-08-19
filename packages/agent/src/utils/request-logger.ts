import fs from 'node:fs'
import path from 'node:path'

import { decomposeMessages, decomposeSystemPrompt, decomposeTools } from '@december/shared'

import type { RequestLogEntry, ToolCall } from '@december/shared'

export interface CreateRequestLogEntryParams {
    turn: number
    sessionId: string
    model?: string
    systemPrompt: string
    tools: any[]
    messages: any[]
    assistantMessage: string
    thinking?: string
    toolCalls: ToolCall[]
    usage?: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
    }
    durationMs: number
    error?: string
    timestamp?: string
}

export function createRequestLogEntry(params: CreateRequestLogEntryParams): RequestLogEntry {
    const {
        turn,
        sessionId,
        model,
        systemPrompt,
        tools,
        messages,
        assistantMessage,
        thinking,
        toolCalls,
        usage,
        durationMs,
        error,
        timestamp = new Date().toISOString(),
    } = params

    const sysDecomp = decomposeSystemPrompt(systemPrompt)
    const toolsDecomp = decomposeTools(tools)
    const msgsDecomp = decomposeMessages(messages)

    const totalEstimatedTokens =
        sysDecomp.totalTokens + toolsDecomp.totalTokens + msgsDecomp.totalTokens

    const logEntry: RequestLogEntry = {
        turn,
        timestamp,
        sessionId,
        model,
        request: {
            systemPrompt,
            systemPromptDecomposition: sysDecomp,
            tools: toolsDecomp.allTools,
            messages,
            toolTokens: toolsDecomp.totalTokens,
            messagesTokens: msgsDecomp.totalTokens,
            totalEstimatedTokens,
        },
        response: {
            assistantMessage,
            thinking: thinking || undefined,
            toolCalls: toolCalls || [],
            usage,
            durationMs,
            error,
        },
    }

    return logEntry
}

export function getSessionLogPath(workspaceDir: string, sessionId: string): string {
    if (!workspaceDir) return ''
    const cleanSessionId = sessionId.startsWith('session-') ? sessionId : `session-${sessionId}`
    return path.join(workspaceDir, '.december', 'logs', `${cleanSessionId}.jsonl`)
}

export async function appendTurnLog(
    workspaceDir: string | undefined,
    sessionId: string,
    entry: RequestLogEntry
): Promise<void> {
    if (!workspaceDir) return
    try {
        const logFile = getSessionLogPath(workspaceDir, sessionId)
        if (!logFile) return
        const logsDir = path.dirname(logFile)
        await fs.promises.mkdir(logsDir, { recursive: true })
        const line = JSON.stringify(entry) + '\n'
        await fs.promises.appendFile(logFile, line, 'utf8')
    } catch (e) {
        // Intentionally swallowed: Request logging must never block or crash the agent loop
    }
}

export async function getTurnLogs(
    workspaceDir: string | undefined,
    sessionId: string
): Promise<RequestLogEntry[]> {
    if (!workspaceDir) return []
    try {
        const logFile = getSessionLogPath(workspaceDir, sessionId)
        if (!logFile || !fs.existsSync(logFile)) {
            return []
        }
        const content = await fs.promises.readFile(logFile, 'utf8')
        return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line))
    } catch (e) {
        // Intentionally swallowed: return empty array if log file cannot be read
        return []
    }
}
