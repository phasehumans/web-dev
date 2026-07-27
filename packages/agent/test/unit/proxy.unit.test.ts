import { describe, test, expect, mock } from 'bun:test'

import { Agent } from '../../src/agent'
import { EventStreamingProxy } from '../../src/proxy'
import { MockLLM } from '../mock-provider'

describe('EventStreamingProxy (Unit)', () => {
    test('run method serializes events and sends to rpc', async () => {
        const llm = new MockLLM()
        llm.pushResponse([
            { type: 'thinking_delta', text: 'Thinking hard' },
            { type: 'text', text: 'Output answer' },
            { type: 'usage', promptTokens: 10, completionTokens: 20 },
        ])

        const mockAgent = new Agent({
            llm,
            tools: [],
            operations: {} as any,
        })

        const proxy = new EventStreamingProxy(mockAgent)

        const sentEvents: string[] = []
        const rpc = {
            onMessage: mock(),
            sendEvent: mock((eventStr: string) => {
                sentEvents.push(eventStr)
            }),
        }

        await proxy.run('Start task', rpc)

        expect(rpc.sendEvent).toHaveBeenCalled()
        expect(sentEvents.length).toBeGreaterThan(0)

        const parsedEvents = sentEvents.map((s) => JSON.parse(s))

        expect(parsedEvents.some((e) => e.type === 'AgentStart')).toBe(true)
        expect(
            parsedEvents.some((e) => e.type === 'ThinkingChunk' && e.content === 'Thinking hard')
        ).toBe(true)
        expect(
            parsedEvents.some((e) => e.type === 'StreamChunk' && e.content === 'Output answer')
        ).toBe(true)
        expect(parsedEvents.some((e) => e.type === 'AgentUsage' && e.promptTokens === 10)).toBe(
            true
        )
        expect(parsedEvents.some((e) => e.type === 'AgentEnd')).toBe(true)
    })
})
