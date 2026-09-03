import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'bun:test'

import {
    createRequestLogEntry,
    appendTurnLog,
    getTurnLogs,
    getSessionLogPath,
    getLogsDir,
} from '../../src/utils/request-logger'

describe('Request Logger Core (Unit)', () => {
    test('creates full structured RequestLogEntry with pre-flight decomposition and post-flight metrics', () => {
        const entry = createRequestLogEntry({
            turn: 1,
            sessionId: 'test-session-123',
            model: 'gemini-3.6-flash',
            systemPrompt:
                'You are December.\n\nAvailable Skills:\n- Skill 1\n\n<project_context>\n<project_instructions path="AGENTS.md">\nFollow rules\n</project_instructions>\n</project_context>\n\nCurrent date: 2026-08-19',
            tools: [
                {
                    name: 'read_file',
                    description: 'Read file',
                    inputSchema: { type: 'object' },
                },
                {
                    name: 'github__search_prs',
                    description: 'Search PRs via MCP',
                    inputSchema: { type: 'object' },
                },
            ],
            messages: [{ role: 'user', content: 'Fix the bug in auth' }],
            assistantMessage: 'I will inspect auth files.',
            thinking: 'Let us check the auth module first.',
            toolCalls: [{ id: 'tc-1', name: 'read_file', input: '{"path":"auth.ts"}' }],
            usage: { promptTokens: 150, completionTokens: 45, totalTokens: 195 },
            durationMs: 420,
        })

        expect(entry.turn).toBe(1)
        expect(entry.sessionId).toBe('test-session-123')
        expect(entry.model).toBe('gemini-3.6-flash')
        expect(entry.request.systemPromptDecomposition.basePrompt).toBe('You are December.')
        expect(entry.request.systemPromptDecomposition.skills).toEqual(['- Skill 1'])
        expect(entry.request.systemPromptDecomposition.rules.length).toBe(1)
        expect(entry.request.systemPromptDecomposition.rules[0].path).toBe('AGENTS.md')
        expect(entry.request.tools.length).toBe(2)
        expect(entry.request.tools[0].name).toBe('read_file')
        expect(entry.request.tools[0].isMcp).toBe(false)
        expect(entry.request.tools[1].name).toBe('github__search_prs')
        expect(entry.request.tools[1].isMcp).toBe(true)

        expect(entry.response.assistantMessage).toBe('I will inspect auth files.')
        expect(entry.response.thinking).toBe('Let us check the auth module first.')
        expect(entry.response.toolCalls.length).toBe(1)
        expect(entry.response.usage).toEqual({
            promptTokens: 150,
            completionTokens: 45,
            totalTokens: 195,
        })
        expect(entry.response.durationMs).toBe(420)
    })

    test('getSessionLogPath computes path matching global config logs/session-<id>.jsonl or custom logsDir', () => {
        const defaultPath = getSessionLogPath('123')
        expect(defaultPath).toBe(path.join(getLogsDir(), 'session-123.jsonl'))

        const customDir = '/custom/logs'
        const customPath = getSessionLogPath('session-456', customDir)
        expect(customPath).toBe(path.join('/custom/logs', 'session-456.jsonl'))
    })

    test('appends and reads turn logs in JSONL format asynchronously', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'december-logger-test-'))
        const sessionId = 'session-test-append'

        try {
            const entry1 = createRequestLogEntry({
                turn: 1,
                sessionId,
                model: 'gemini-3.6-flash',
                systemPrompt: 'Base prompt 1',
                tools: [],
                messages: [{ role: 'user', content: 'Turn 1 prompt' }],
                assistantMessage: 'Turn 1 answer',
                toolCalls: [],
                durationMs: 100,
            })

            const entry2 = createRequestLogEntry({
                turn: 2,
                sessionId,
                model: 'gemini-3.6-flash',
                systemPrompt: 'Base prompt 1',
                tools: [],
                messages: [
                    { role: 'user', content: 'Turn 1 prompt' },
                    { role: 'assistant', content: 'Turn 1 answer' },
                    { role: 'user', content: 'Turn 2 prompt' },
                ],
                assistantMessage: 'Turn 2 answer',
                toolCalls: [],
                durationMs: 150,
            })

            await appendTurnLog(tmpDir, sessionId, entry1)
            await appendTurnLog(tmpDir, sessionId, entry2)

            const logs = await getTurnLogs(tmpDir, sessionId)
            expect(logs.length).toBe(2)
            expect(logs[0].turn).toBe(1)
            expect(logs[0].response.assistantMessage).toBe('Turn 1 answer')
            expect(logs[1].turn).toBe(2)
            expect(logs[1].response.assistantMessage).toBe('Turn 2 answer')

            const rawFile = fs.readFileSync(getSessionLogPath(tmpDir, sessionId), 'utf8')
            const lines = rawFile.trim().split('\n')
            expect(lines.length).toBe(2)
            expect(() => JSON.parse(lines[0])).not.toThrow()
            expect(() => JSON.parse(lines[1])).not.toThrow()
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    test('swallows errors gracefully when append fails without throwing', async () => {
        // Passing an invalid path such as a file path where directory is expected
        const tmpFile = path.join(os.tmpdir(), `december-file-${Date.now()}`)
        fs.writeFileSync(tmpFile, 'test')
        try {
            // Attempting to append into a directory that is actually a file
            const entry = createRequestLogEntry({
                turn: 1,
                sessionId: 'session-err',
                systemPrompt: 'Test',
                tools: [],
                messages: [],
                assistantMessage: '',
                toolCalls: [],
                durationMs: 0,
            })
            // Should not throw
            await expect(appendTurnLog(tmpFile, 'session-err', entry)).resolves.toBeUndefined()
        } finally {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
        }
    })
})
