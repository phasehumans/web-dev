import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { MockLLM } from '../mock-provider'

describe('Pending Message Queue Exhaustive (Unit)', () => {
    it('handles rapid interleaved steering pushes and drains in one-at-a-time mode', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            steeringMode: 'one-at-a-time',
        })

        agent.steer({ role: 'user', content: 'msg 1' })
        agent.steer({ role: 'user', content: 'msg 2' })
        expect(agent.steeringQueue.length).toBe(2)

        const first = agent.steeringQueue.drain()
        expect(first.length).toBe(1)
        expect(first[0]!.content).toBe('msg 1')

        agent.steer({ role: 'user', content: 'msg 3' })
        expect(agent.steeringQueue.length).toBe(2)

        const second = agent.steeringQueue.drain()
        expect(second.length).toBe(1)
        expect(second[0]!.content).toBe('msg 2')

        const third = agent.steeringQueue.drain()
        expect(third.length).toBe(1)
        expect(third[0]!.content).toBe('msg 3')

        expect(agent.steeringQueue.drain()).toEqual([])
    })

    it('handles all mode draining empty queue and multiple messages', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            steeringMode: 'all',
            followUpMode: 'all',
        })

        expect(agent.followUpQueue.drain()).toEqual([])

        for (let i = 0; i < 50; i++) {
            agent.followUp({ role: 'user', content: `follow-${i}` })
        }

        expect(agent.followUpQueue.length).toBe(50)
        const drained = agent.followUpQueue.drain()
        expect(drained.length).toBe(50)
        expect(agent.followUpQueue.length).toBe(0)
        expect(drained[0]!.content).toBe('follow-0')
        expect(drained[49]!.content).toBe('follow-49')
    })
})
