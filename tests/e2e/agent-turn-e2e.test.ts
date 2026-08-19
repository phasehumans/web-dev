import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Agent, runAgentLoop } from '@december/agent'
import {
    ReadFileTool,
    WriteFileTool,
    EditDiffTool,
    GrepSearchTool,
    AskQuestionTool,
} from '@december/tools'
import { describe, expect, it } from 'bun:test'

import { FileSessionRepository } from '../../apps/cli/src/file-session-repository'

import type { LLMProvider } from '@december/providers'

describe('End-to-End Multi-Turn Agent Coding Workflow', () => {
    it('simulates an end-to-end coding turn: creating source, searching symbols, editing via fuzzy patch, and asking questions', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-agent-workflow-'))
        const sessionRepo = new FileSessionRepository(path.join(tmpDir, 'sessions'))
        const sourceFilePath = path.join(tmpDir, 'auth-service.ts')

        try {
            let turnCount = 0
            const mockLlm: LLMProvider = {
                id: 'e2e-mock-llm',
                stream: async function* () {
                    turnCount++
                    if (turnCount === 1) {
                        // Turn 1: Write initial source file
                        yield { type: 'thinking_delta', text: 'Step 1: Scaffolding auth service' }
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: 'tc-write',
                                name: 'write_file',
                                input: JSON.stringify({
                                    filePath: sourceFilePath,
                                    content: `export interface User {\n    id: string;\n    role: string;\n}\n\nexport function verifyUser(u: User): boolean {\n    return u.role === 'admin';\n}\n`,
                                }),
                            },
                        }
                    } else if (turnCount === 2) {
                        // Turn 2: Edit file using diff
                        yield {
                            type: 'thinking_delta',
                            text: 'Step 2: Adding superadmin support via patch',
                        }
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: 'tc-edit',
                                name: 'edit_diff',
                                input: JSON.stringify({
                                    path: sourceFilePath,
                                    diff: `@@ -6,3 +6,3 @@\n export function verifyUser(u: User): boolean {\n-    return u.role === 'admin';\n+    return u.role === 'admin' || u.role === 'superadmin';\n }\n`,
                                }),
                            },
                        }
                    } else if (turnCount === 3) {
                        // Turn 3: Ask question to user
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: 'tc-ask',
                                name: 'ask_question',
                                input: JSON.stringify({
                                    questions: [
                                        {
                                            question: 'Should we add guest role fallback?',
                                            options: ['Yes', 'No'],
                                        },
                                    ],
                                }),
                            },
                        }
                    } else {
                        yield { type: 'text', text: 'Authentication service refactor completed.' }
                    }
                },
            }

            const agent = new Agent({
                sessionId: 'e2e-auth-refactor-session',
                llm: mockLlm,
                tools: [ReadFileTool, WriteFileTool, EditDiffTool, GrepSearchTool, AskQuestionTool],
                operations: {
                    fs: {
                        writeFile: (p: string, c: string) => fsp.writeFile(p, c, 'utf-8'),
                        readFile: (p: string) => fsp.readFile(p, 'utf-8'),
                    },
                    ui: {
                        askQuestion: async (questions: any[]) => {
                            expect(questions.length).toBe(1)
                            return 'Yes'
                        },
                    },
                } as any,
                sessionRepository: sessionRepo,
            })

            const events: string[] = []
            for await (const event of runAgentLoop(agent, 'Refactor the auth service')) {
                events.push(event.type)
            }

            expect(events).toContain('AgentStart')
            expect(events).toContain('ToolCallResult')
            expect(events).toContain('AgentEnd')

            // Verify file was created and patched
            expect(fs.existsSync(sourceFilePath)).toBe(true)
            const finalSource = fs.readFileSync(sourceFilePath, 'utf-8')
            expect(finalSource).toContain("u.role === 'superadmin'")

            // Verify session history has all turns persisted
            const history = await sessionRepo.loadContext('e2e-auth-refactor-session')
            expect(history.length).toBeGreaterThan(4)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
