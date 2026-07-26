import { describe, test, expect, mock } from 'bun:test'

import { Agent } from '../../src/agent'
import { EventStreamingProxy } from '../../src/proxy'
import { MockLLM } from '../mock-provider'

describe('EventStreamingProxy (Unit)', () => {
    test('run method serializes events and sends to rpc', async () => {
        const mockAgent = new Agent({
            llm: new MockLLM(),
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

        await proxy.run('Start', rpc)

        expect(rpc.sendEvent).toHaveBeenCalled()
        expect(sentEvents.length).toBeGreaterThan(0)

        const hasTextChunk = sentEvents.some((str) => str.includes('default response'))
        expect(hasTextChunk).toBe(true)

        const hasTurnStart = sentEvents.some((str) => str.includes('TurnStart'))
        expect(hasTurnStart).toBe(true)

        const hasAgentEnd = sentEvents.some((str) => str.includes('AgentEnd'))
        expect(hasAgentEnd).toBe(true)
    })
})
