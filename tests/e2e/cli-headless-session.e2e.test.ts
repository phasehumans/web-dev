import { PassThrough } from 'node:stream'

import { Agent } from '@december/agent'
import { describe, expect, it } from 'bun:test'

import { runHeadlessTask } from '../../apps/cli/src/headless-runner'

import type { LLMProvider } from '@december/providers'

describe('CLI Headless Session E2E Tests', () => {
    it('executes headless task with real-time stream output, tool events, and usage stats', async () => {
        let turn = 0
        const mockProvider: LLMProvider = {
            id: 'mock-headless-llm',
            stream: async function* () {
                turn++
                if (turn === 1) {
                    yield { type: 'thinking_delta', text: 'Analyzing user request...' }
                    yield {
                        type: 'tool_call',
                        toolCall: {
                            id: 'tc-calc',
                            name: 'compute_metric',
                            input: JSON.stringify({ x: 5, y: 10 }),
                        },
                    }
                } else {
                    yield { type: 'text', text: 'Metric calculation is complete.' }
                    yield { type: 'usage', promptTokens: 45, completionTokens: 18 }
                }
            },
        }

        const computeTool = {
            name: 'compute_metric',
            description: 'Computes metrics',
            inputSchema: {},
            execute: async (args: any) => `Result: ${args.x + args.y}`,
        }

        const agent = new Agent({
            sessionId: 'cli-headless-e2e-session',
            llm: mockProvider,
            tools: [computeTool],
            operations: {} as any,
        })

        const stdin = new PassThrough()
        const stdout = new PassThrough()
        const stderr = new PassThrough()

        let stdoutData = ''
        let stderrData = ''
        stdout.on('data', (chunk) => {
            stdoutData += chunk.toString()
        })
        stderr.on('data', (chunk) => {
            stderrData += chunk.toString()
        })

        const result = await runHeadlessTask('Calculate metrics for pipeline', {
            agent,
            stdin,
            stdout,
            stderr,
            nonInteractive: true,
            isAuthenticated: true,
        })

        expect(result.success).toBe(true)
        expect(stdoutData).toContain('[Tool Executing: compute_metric]')
        expect(stdoutData).toContain('[Tool Result Received]')
        expect(stdoutData).toContain('Metric calculation is complete.')
        expect(stdoutData).toContain('[Usage: 45 prompt, 18 completion]')
        expect(stdoutData).toContain('Headless task complete.')
        expect(stderrData).toBe('')
    })

    it('handles interactive tool permission auto-approval in nonInteractive mode', async () => {
        let turn = 0
        const mockProvider: LLMProvider = {
            id: 'mock-permission-llm',
            stream: async function* () {
                turn++
                if (turn === 1) {
                    yield {
                        type: 'tool_call',
                        toolCall: {
                            id: 'tc-cmd',
                            name: 'run_command',
                            input: JSON.stringify({ command: 'echo hello' }),
                        },
                    }
                } else {
                    yield { type: 'text', text: 'Command approved and executed.' }
                }
            },
        }

        const runCmdTool = {
            name: 'run_command',
            description: 'Runs command',
            inputSchema: {},
            execute: async () => 'hello',
        }

        const agent = new Agent({
            sessionId: 'cli-permission-e2e',
            llm: mockProvider,
            tools: [runCmdTool],
            operations: {} as any,
        })

        const stdin = new PassThrough()
        const stdout = new PassThrough()
        const stderr = new PassThrough()

        let stdoutData = ''
        stdout.on('data', (chunk) => {
            stdoutData += chunk.toString()
        })

        const result = await runHeadlessTask('Execute shell command', {
            agent,
            stdin,
            stdout,
            stderr,
            nonInteractive: true,
            isAuthenticated: true,
        })

        expect(result.success).toBe(true)
        expect(stdoutData).toContain('Command approved and executed.')
    })

    it('rejects execution when unauthenticated with error on stderr', async () => {
        const agent = new Agent({
            sessionId: 'unauth-session',
            llm: {
                id: 'mock',
                stream: async function* () {
                    yield { type: 'text', text: '' }
                },
            },
            tools: [],
            operations: {} as any,
        })

        const stdout = new PassThrough()
        const stderr = new PassThrough()

        let stderrData = ''
        stderr.on('data', (chunk) => {
            stderrData += chunk.toString()
        })

        const result = await runHeadlessTask('Prompt while logged out', {
            agent,
            stdout,
            stderr,
            isAuthenticated: false,
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Not authenticated')
        expect(stderrData).toContain('Error: Not authenticated')
    })
})
