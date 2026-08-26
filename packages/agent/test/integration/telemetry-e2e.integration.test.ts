import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { runAgentLoop } from '../../src/agent-loop'
import { AgentHarness } from '../../src/harness/agent-harness'
import { LangfuseTracer } from '../../src/telemetry/langfuse-tracer'
import { NoopTracer } from '../../src/telemetry/noop-tracer'
import { MockLLM } from '../mock-provider'

import type { PlatformAdapter } from '../../src/platform-adapter'

describe('Telemetry End-to-End Runtime Resolution & Tracing (Integration)', () => {
    const originalEnv = { ...process.env }
    const mockPlatformAdapter: PlatformAdapter = {
        readFile: async () => 'mock file content',
        writeFile: async () => {},
        listFiles: async () => [],
    } as any

    beforeEach(() => {
        process.env = { ...originalEnv }
        delete process.env.DECEMBER_DEV_TELEMETRY
        delete process.env.LANGFUSE_PUBLIC_KEY
        delete process.env.LANGFUSE_SECRET_KEY
        delete process.env.LANGFUSE_BASE_URL
        delete process.env.LANGFUSE_BASEURL
        delete process.env.LANGFUSE_HOST
    })

    afterEach(() => {
        process.env = { ...originalEnv }
    })

    it('cloud runtime initializes LangfuseTracer and completes multi-turn agent loop', async () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-mock'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-mock'
        process.env.NODE_ENV = 'production'

        const mockLLM = new MockLLM()
        mockLLM.pushResponse([
            {
                type: 'tool_call',
                toolCall: {
                    id: 'tc-cloud-1',
                    name: 'read_file',
                    input: JSON.stringify({ path: 'src/index.ts' }),
                },
            },
        ])
        mockLLM.pushResponse([
            { type: 'text', text: 'Completed cloud analysis.' },
            { type: 'usage', promptTokens: 50, completionTokens: 10 },
        ])

        const readTool = {
            name: 'read_file',
            description: 'Read file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
            execute: async (args: any) => `content of ${args.path}`,
        }

        const mockSpan = {
            generation: () => {},
            span: () => ({ end: () => {} }),
            end: () => {},
        }
        const mockTrace = {
            span: () => mockSpan,
            update: () => {},
        }
        const mockClient: any = {
            trace: () => mockTrace,
            flushAsync: async () => {},
        }

        const tracer = new LangfuseTracer({
            sessionId: 'cloud-sess-e2e',
            userId: 'user-cloud-1',
            environment: 'production',
            client: mockClient,
        })

        const harness = new AgentHarness({
            sessionId: 'cloud-sess-e2e',
            userId: 'user-cloud-1',
            runtime: 'cloud',
            tracer,
            llm: mockLLM,
            tools: [readTool],
            operations: mockPlatformAdapter,
            workspaceDir: '/workspace',
            skipMcp: true,
        })

        const agent = harness.getAgent()
        expect(agent.tracer).toBeInstanceOf(LangfuseTracer)

        const events = []
        for await (const event of runAgentLoop(agent, 'Inspect workspace')) {
            events.push(event)
        }

        const textEvents = events.filter((e) => e.type === 'StreamChunk')
        expect(textEvents.length).toBe(1)
        expect((textEvents[0] as any).content).toBe('Completed cloud analysis.')
    })

    it('CLI runtime in production mode strictly initializes NoopTracer with zero remote side-effects', async () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-test'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-test'
        process.env.NODE_ENV = 'production'

        const mockLLM = new MockLLM()
        mockLLM.pushResponse([{ type: 'text', text: 'Private CLI answer' }])

        const harness = new AgentHarness({
            sessionId: 'cli-user-sess-e2e',
            runtime: 'cli',
            llm: mockLLM,
            tools: [],
            operations: mockPlatformAdapter,
            workspaceDir: '/workspace',
            skipMcp: true,
        })

        const agent = harness.getAgent()
        expect(agent.tracer).toBeInstanceOf(NoopTracer)

        const events = []
        for await (const event of runAgentLoop(agent, 'Private prompt')) {
            events.push(event)
        }

        const textEvents = events.filter((e) => e.type === 'StreamChunk')
        expect(textEvents.length).toBe(1)
        expect((textEvents[0] as any).content).toBe('Private CLI answer')
    })

    it('CLI runtime in development mode with keys initializes LangfuseTracer for developer debugging', async () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-dev'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-dev'
        process.env.NODE_ENV = 'development'

        const mockLLM = new MockLLM()
        mockLLM.pushResponse([{ type: 'text', text: 'Developer CLI debug answer' }])

        const harness = new AgentHarness({
            sessionId: 'cli-dev-sess-e2e',
            runtime: 'cli',
            llm: mockLLM,
            tools: [],
            operations: mockPlatformAdapter,
            workspaceDir: '/workspace',
            skipMcp: true,
        })

        const agent = harness.getAgent()
        expect(agent.tracer).toBeInstanceOf(LangfuseTracer)
    })
})
