import { describe, test, expect } from 'bun:test'

import { Agent } from '../../src/agent'
import { MockLLM } from '../mock-provider'

const mockOperations = {} as any

describe('Agent core functionality (Unit)', () => {
    test('initializes with default system prompt and tools map', () => {
        const tool1 = { name: 'tool_a', description: 'desc a', inputSchema: {} } as any
        const tool2 = { name: 'tool_b', description: 'desc b', inputSchema: {} } as any

        const agent = new Agent({
            llm: new MockLLM(),
            tools: [tool1, tool2],
            operations: mockOperations,
        })

        expect(agent.messages.length).toBe(1)
        expect(agent.messages[0]!.role).toBe('system')
        expect(agent.messages[0]!.content).toBe('You are a helpful coding agent.')
        expect(agent.tools.size).toBe(2)
        expect(agent.tools.get('tool_a')).toBe(tool1)
        expect(agent.tools.get('tool_b')).toBe(tool2)
        expect(agent.thinkingLevel).toBe('auto')
    })

    test('initializes queues based on mode', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
            steeringMode: 'one-at-a-time',
            followUpMode: 'all',
        })
        expect(agent.steeringQueue.mode).toBe('one-at-a-time')
        expect(agent.followUpQueue.mode).toBe('all')
    })

    test('steer queue push and drain', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
            steeringMode: 'one-at-a-time',
        })
        agent.steer({ role: 'user', content: 'steer1' })
        agent.steer({ role: 'user', content: 'steer2' })
        expect(agent.steeringQueue.length).toBe(2)

        const drained1 = agent.steeringQueue.drain()
        expect(drained1.length).toBe(1)
        expect(drained1[0]!.content).toBe('steer1')
        expect(agent.steeringQueue.length).toBe(1)

        const drained2 = agent.steeringQueue.drain()
        expect(drained2.length).toBe(1)
        expect(drained2[0]!.content).toBe('steer2')

        expect(agent.steeringQueue.drain()).toEqual([])
    })

    test('followUp queue drain all mode', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
            followUpMode: 'all',
        })
        agent.followUp({ role: 'user', content: 'follow1' })
        agent.followUp({ role: 'user', content: 'follow2' })

        const drained = agent.followUpQueue.drain()
        expect(drained.length).toBe(2)
        expect(drained[0]!.content).toBe('follow1')
        expect(drained[1]!.content).toBe('follow2')
        expect(agent.followUpQueue.length).toBe(0)
        expect(agent.followUpQueue.drain()).toEqual([])
    })

    test('filters out isUI messages in defaultConvertToLlm', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
        })
        agent.addMessage({ role: 'user', content: 'User msg' })
        agent.addMessage({ role: 'assistant', content: 'UI status msg', isUI: true })

        const providerMsgs = agent.convertToLlm(agent.messages)
        expect(providerMsgs.length).toBe(2) // system prompt + user msg
        expect(providerMsgs.some((m) => m.content === 'UI status msg')).toBe(false)
    })

    test('uses custom convertToLlm when provided', () => {
        const customConvert = (msgs: any[]) => msgs.map((m) => ({ ...m, content: 'custom' }))
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
            convertToLlm: customConvert,
        })
        const providerMsgs = agent.convertToLlm(agent.messages)
        expect(providerMsgs[0]!.content).toBe('custom')
    })

    test('clearContext leaves only system prompt', async () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
        })
        agent.addMessage({ role: 'user', content: 'hello' })
        expect(agent.messages.length).toBe(2)

        await agent.clearContext()
        expect(agent.messages.length).toBe(1)
        expect(agent.messages[0]!.role).toBe('system')
    })

    test('handles saveContext, loadContext without sessionRepository gracefully', async () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
        })
        await expect(agent.saveContext()).resolves.toBeUndefined()
        await expect(agent.loadContext()).resolves.toBeUndefined()
    })

    test('persistence and session handling', async () => {
        const store: Record<string, any> = {}
        const mockSessionRepo = {
            saveContext: async (id: string, msgs: any[]) => {
                store[id] = msgs
            },
            loadContext: async (id: string) => store[id] || [],
        }

        const agent = new Agent({
            sessionId: 'session-1',
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
            sessionRepository: mockSessionRepo,
        })

        agent.addMessage({ role: 'user', content: 'msg 1' })
        await agent.saveContext()
        expect(store['session-1'].length).toBe(2)

        const newSessionId = await agent.forkContext('session-2')
        expect(newSessionId).toBe('session-2')
        expect(agent.sessionId).toBe('session-2')
        expect(store['session-2'].length).toBe(2)

        await agent.newContext()
        expect(agent.sessionId).not.toBe('session-2')
        expect(agent.messages.length).toBe(1)

        await agent.loadContext('session-1')
        expect(agent.sessionId).toBe('session-1')
        expect(agent.messages.length).toBe(2)
        expect(agent.messages[1]!.content).toBe('msg 1')
    })

    test('setLLM updates the llm provider', () => {
        const agent = new Agent({
            llm: new MockLLM('mock1'),
            tools: [],
            operations: mockOperations,
        })
        expect(agent.llm.id).toBe('mock1')

        agent.setLLM(new MockLLM('mock2'))
        expect(agent.llm.id).toBe('mock2')
    })

    test('abort controller triggers abort', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: mockOperations,
        })
        const abortController = new AbortController()
        agent.activeAbortController = abortController

        expect(abortController.signal.aborted).toBe(false)
        agent.abort()
        expect(abortController.signal.aborted).toBe(true)
    })
})
