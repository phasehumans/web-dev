import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Agent, runAgentLoop } from '@december/agent'
import { ReadFileTool, WriteFileTool } from '@december/tools'
import { describe, expect, it } from 'bun:test'

import { FileSessionRepository } from '../../apps/cli/src/file-session-repository'

import type { LLMProvider } from '@december/providers'

describe('Full-Stack Integration Smoke Tests', () => {
    it('executes full multi-turn cycle with file operations, tool calls, thinking chunks, and session persistence', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-fullstack-'))
        const sessionRepo = new FileSessionRepository(path.join(tmpDir, 'sessions'))
        const targetFilePath = path.join(tmpDir, 'test-file.txt')

        try {
            let turn = 0
            const mockProvider: LLMProvider = {
                id: 'fullstack-smoke-provider',
                stream: async function* () {
                    turn++
                    if (turn === 1) {
                        yield { type: 'thinking_delta', text: 'Analyzing file requirements...' }
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: 'tc-write',
                                name: 'write_file',
                                input: JSON.stringify({
                                    filePath: targetFilePath,
                                    content: 'Initial generated content line 1\nLine 2',
                                }),
                            },
                        }
                    } else if (turn === 2) {
                        yield { type: 'thinking_delta', text: 'Verifying file contents...' }
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: 'tc-read',
                                name: 'read_file',
                                input: JSON.stringify({
                                    filePath: targetFilePath,
                                }),
                            },
                        }
                    } else {
                        yield { type: 'text', text: 'File operations completed successfully.' }
                    }
                },
            }

            const agent = new Agent({
                sessionId: 'smoke-fullstack-sess',
                llm: mockProvider,
                tools: [ReadFileTool, WriteFileTool],
                operations: {
                    fs: {
                        writeFile: fsp.writeFile,
                        readFile: fsp.readFile,
                    },
                } as any,
                sessionRepository: sessionRepo,
            })

            const events: string[] = []
            for await (const event of runAgentLoop(agent, 'Create and verify test file')) {
                events.push(event.type)
            }

            expect(events).toContain('AgentStart')
            expect(events).toContain('TurnStart')
            expect(events).toContain('ToolCallResult')
            expect(events).toContain('AgentEnd')

            // Verify file was written to disk
            expect(fs.existsSync(targetFilePath)).toBe(true)
            const writtenContent = fs.readFileSync(targetFilePath, 'utf-8')
            expect(writtenContent).toContain('Initial generated content line 1')

            // Verify session history was persisted to repository
            const loadedMessages = await sessionRepo.loadContext('smoke-fullstack-sess')
            expect(loadedMessages.length).toBeGreaterThan(3)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
