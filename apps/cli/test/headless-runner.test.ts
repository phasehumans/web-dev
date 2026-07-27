import { PassThrough } from 'stream'

import { describe, it, expect, beforeEach, mock } from 'bun:test'

const mockRunAgentLoop = mock()

mock.module('@december/agent', () => {
    return {
        runAgentLoop: mockRunAgentLoop,
        Agent: class MockAgent {},
    }
})

import { runHeadlessTask } from '../src/headless-runner'

describe('runHeadlessTask', () => {
    let mockAgent: any
    let mockStdin: PassThrough
    let mockStdout: PassThrough

    beforeEach(() => {
        mockRunAgentLoop.mockClear()
        mockAgent = {
            operations: { ui: {} },
            steer: mock(),
        }
        mockStdin = new PassThrough()
        mockStdout = new PassThrough()
    })

    it('executes agent loop with prompt without initializing Ink TUI', async () => {
        async function* mockGenerator() {
            yield { type: 'StreamChunk', content: 'Hello world' }
            yield { type: 'AgentUsage', promptTokens: 10, completionTokens: 5 }
        }

        mockRunAgentLoop.mockReturnValue(mockGenerator())

        let stdoutData = ''
        mockStdout.on('data', (chunk) => {
            stdoutData += chunk.toString()
        })

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
        })

        expect(mockRunAgentLoop).toHaveBeenCalledWith(mockAgent, 'test prompt')
        expect(result.success).toBe(true)
        expect(stdoutData).toBe('Hello world')
    })

    it('attaches askQuestion and requestPermission to agent.operations.ui', async () => {
        async function* mockGenerator() {
            yield { type: 'StreamChunk', content: 'Done' }
        }
        mockRunAgentLoop.mockReturnValue(mockGenerator())

        await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
        })

        expect(mockAgent.operations.ui.askQuestion).toBeDefined()
        expect(mockAgent.operations.ui.requestPermission).toBeDefined()
    })

    it('returns success: false on AgentError event', async () => {
        async function* mockGenerator() {
            yield { type: 'AgentError', error: 'LLM Rate limit reached' }
        }
        mockRunAgentLoop.mockReturnValue(mockGenerator())

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('LLM Rate limit reached')
    })
})
