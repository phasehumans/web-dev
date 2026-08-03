import { PassThrough } from 'stream'

import { describe, it, expect, beforeEach, mock } from 'bun:test'

const mockRunAgentLoop = mock()

mock.module('@december/agent', () => {
    return {
        runAgentLoop: mockRunAgentLoop,
        Agent: class MockAgent {},
    }
})

import { runHeadlessTask, restoreConsole, suppressConsole } from '../src/headless-runner'

describe('runHeadlessTask', () => {
    let mockAgent: any
    let mockStdin: PassThrough
    let mockStdout: PassThrough
    let mockStderr: PassThrough

    beforeEach(() => {
        mockRunAgentLoop.mockClear()
        mockAgent = {
            operations: { ui: {} },
            steer: mock(),
        }
        mockStdin = new PassThrough()
        mockStdout = new PassThrough()
        mockStderr = new PassThrough()
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
            stderr: mockStderr as any,
        })

        expect(mockRunAgentLoop).toHaveBeenCalledWith(mockAgent, 'test prompt')
        expect(result.success).toBe(true)
        expect(stdoutData).toContain('Hello world')
        expect(stdoutData).toContain('[Usage: 10 prompt, 5 completion]')
        expect(stdoutData).toContain('Headless task complete.')
    })

    it('routes thinking deltas, agent status, and context compaction to stdout', async () => {
        async function* mockGenerator() {
            yield { type: 'ThinkingChunk', content: 'Analyzing problem space...' }
            yield { type: 'AgentStatus', message: 'Retrying connection...' }
            yield { type: 'ContextCompacted', summary: 'Compacted 10 messages' }
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
            stderr: mockStderr as any,
        })

        expect(result.success).toBe(true)
        expect(stdoutData).not.toContain('Analyzing problem space...')
        expect(stdoutData).toContain('[Status: Retrying connection...]')
        expect(stdoutData).toContain('[Context Compacted: Compacted 10 messages]')
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
            stderr: mockStderr as any,
        })

        expect(mockAgent.operations.ui.askQuestion).toBeDefined()
        expect(mockAgent.operations.ui.requestPermission).toBeDefined()
    })

    it('routes tool execution headers and results to stdout', async () => {
        async function* mockGenerator() {
            yield {
                type: 'ToolCallStart',
                toolCall: { name: 'read_file', input: { filepath: 'a.txt' } },
            }
            yield {
                type: 'ToolCallResult',
                result: { output: 'file contents' },
            }
        }
        mockRunAgentLoop.mockReturnValue(mockGenerator())

        let stdoutData = ''
        mockStdout.on('data', (chunk) => {
            stdoutData += chunk.toString()
        })

        await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
        })

        expect(stdoutData).toContain('[Tool Executing: read_file]')
        expect(stdoutData).toContain('{"filepath":"a.txt"}')
        expect(stdoutData).toContain('[Tool Result Received]')
    })

    it('routes tool errors and agent errors to stderr', async () => {
        async function* mockGenerator() {
            yield {
                type: 'ToolCallResult',
                result: { error: 'File not found' },
            }
            yield { type: 'AgentError', error: 'LLM Rate limit reached' }
        }
        mockRunAgentLoop.mockReturnValue(mockGenerator())

        let stderrData = ''
        mockStderr.on('data', (chunk) => {
            stderrData += chunk.toString()
        })

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('LLM Rate limit reached')
        expect(stderrData).toContain('[Tool Error] File not found')
        expect(stderrData).toContain('[Error: LLM Rate limit reached]')
    })

    it('isolates askQuestion input from triggering agent.steer', async () => {
        mockRunAgentLoop.mockImplementation(async function* () {
            const ansPromise = mockAgent.operations.ui.askQuestion([
                { question: 'Which framework?', options: ['Next.js', 'Vite'] },
            ])
            mockStdin.write('1\n')
            const ans = await ansPromise
            expect(ans).toBe('Next.js')
            yield { type: 'StreamChunk', content: 'Selected framework' }
        })

        await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
        })

        expect(mockAgent.steer).not.toHaveBeenCalled()
    })

    it('isolates requestPermission input from triggering agent.steer', async () => {
        mockRunAgentLoop.mockImplementation(async function* () {
            const permPromise = mockAgent.operations.ui.requestPermission({
                name: 'run_command',
                input: { CommandLine: 'ls' },
            })
            mockStdin.write('y\n')
            const perm = await permPromise
            expect(perm).toEqual({ block: false })
            yield { type: 'StreamChunk', content: 'Approved' }
        })

        await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
        })

        expect(mockAgent.steer).not.toHaveBeenCalled()
    })

    it('sends user steering input to agent when no prompt is pending', async () => {
        mockRunAgentLoop.mockImplementation(async function* () {
            mockStdin.write('change approach\n')
            yield { type: 'StreamChunk', content: 'Steered' }
        })

        await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
        })

        expect(mockAgent.steer).toHaveBeenCalledWith({
            role: 'user',
            content: 'change approach',
            isUI: true,
        })
    })

    it('auto-approves tool permissions when nonInteractive option is true', async () => {
        mockRunAgentLoop.mockImplementation(async function* () {
            const perm = await mockAgent.operations.ui.requestPermission({
                name: 'run_command',
                input: { CommandLine: 'rm -rf /tmp/test' },
            })
            expect(perm).toEqual({ block: false })
            yield { type: 'StreamChunk', content: 'Executed non-interactively' }
        })

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
            nonInteractive: true,
        })

        expect(result.success).toBe(true)
    })

    it('auto-selects first question option when nonInteractive is true', async () => {
        mockRunAgentLoop.mockImplementation(async function* () {
            const ans = await mockAgent.operations.ui.askQuestion([
                { question: 'Choice?', options: ['Option A', 'Option B'] },
            ])
            expect(ans).toBe('Option A')
            yield { type: 'StreamChunk', content: 'Chosen Option A' }
        })

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
            nonInteractive: true,
        })

        expect(result.success).toBe(true)
    })

    it('fails pre-flight check and exits with error if isAuthenticated is false', async () => {
        let stderrData = ''
        mockStderr.on('data', (chunk) => {
            stderrData += chunk.toString()
        })

        const result = await runHeadlessTask('test prompt', {
            agent: mockAgent,
            stdin: mockStdin as any,
            stdout: mockStdout as any,
            stderr: mockStderr as any,
            isAuthenticated: false,
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Not authenticated')
        expect(stderrData).toContain('Not authenticated')
        expect(mockRunAgentLoop).not.toHaveBeenCalled()
    })

    it('restores console functions when restoreConsole is invoked', () => {
        const originalLog = console.log
        suppressConsole()
        expect(console.log).not.toBe(originalLog)

        restoreConsole()
        expect(console.log).toBe(originalLog)
    })
})
