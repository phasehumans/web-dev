import fs from 'node:fs'
import os from 'node:os'
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

export function getGlobalConfigDir(): string {
    return (
        process.env.DECEMBER_CONFIG_DIR ||
        path.join(process.env.HOME || os.homedir(), '.config', 'december')
    )
}

export function getLogsDir(customDir?: string): string {
    if (customDir) return customDir
    if (process.env.DECEMBER_LOGS_DIR) return process.env.DECEMBER_LOGS_DIR
    return path.join(getGlobalConfigDir(), 'logs')
}

export function getSessionLogPath(sessionIdOrLogsDir: string, logsDirOrSessionId?: string): string {
    if (!sessionIdOrLogsDir && !logsDirOrSessionId) return ''

    let sessionId: string
    let customDir: string | undefined

    if (logsDirOrSessionId) {
        if (
            sessionIdOrLogsDir.startsWith('session-') ||
            (!sessionIdOrLogsDir.includes(path.sep) && logsDirOrSessionId.includes(path.sep))
        ) {
            sessionId = sessionIdOrLogsDir
            customDir = logsDirOrSessionId
        } else {
            customDir = sessionIdOrLogsDir
            sessionId = logsDirOrSessionId
        }
    } else {
        sessionId = sessionIdOrLogsDir
    }

    const cleanSessionId = sessionId.startsWith('session-') ? sessionId : `session-${sessionId}`
    return path.join(getLogsDir(customDir), `${cleanSessionId}.jsonl`)
}

export async function appendTurnLog(
    arg1: string | undefined,
    arg2: string | RequestLogEntry,
    arg3?: RequestLogEntry | string
): Promise<void> {
    try {
        let sessionId: string
        let entry: RequestLogEntry
        let logsDir: string | undefined

        if (typeof arg2 === 'object' && arg2 !== null) {
            if (!arg1) return
            sessionId = arg1
            entry = arg2 as RequestLogEntry
            logsDir = typeof arg3 === 'string' ? arg3 : undefined
        } else {
            if (!arg2 || !arg3 || typeof arg3 !== 'object') return
            sessionId = arg2 as string
            entry = arg3 as RequestLogEntry
            logsDir = arg1
        }

        const logFile = getSessionLogPath(sessionId, logsDir)
        if (!logFile) return
        const dir = path.dirname(logFile)
        await fs.promises.mkdir(dir, { recursive: true })
        const line = JSON.stringify(entry) + '\n'
        await fs.promises.appendFile(logFile, line, 'utf8')
    } catch {
        // Intentionally swallowed: Request logging must never block or crash the agent loop
    }
}

export async function getTurnLogs(
    arg1: string | undefined,
    arg2?: string
): Promise<RequestLogEntry[]> {
    if (!arg1 && !arg2) return []
    try {
        let sessionId: string
        let logsDir: string | undefined

        if (arg2) {
            if (arg1 && (arg1.startsWith('session-') || !arg1.includes(path.sep))) {
                sessionId = arg1
                logsDir = arg2
            } else {
                logsDir = arg1
                sessionId = arg2
            }
        } else {
            sessionId = arg1!
        }

        const logFile = getSessionLogPath(sessionId, logsDir)
        if (!logFile || !fs.existsSync(logFile)) {
            return []
        }
        const content = await fs.promises.readFile(logFile, 'utf8')
        return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line))
    } catch {
        // Intentionally swallowed: return empty array if log file cannot be read
        return []
    }
}
