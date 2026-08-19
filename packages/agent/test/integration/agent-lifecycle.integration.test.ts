import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Agent Full Lifecycle & Session Persistence (Integration)', () => {
    it('persists multi-turn conversations and reloads them accurately', async () => {
        const sessionStore = new Map<string, any[]>()
        const mockRepo = {
            saveContext: async (id: string, msgs: any[]) => {
                sessionStore.set(id, JSON.parse(JSON.stringify(msgs)))
            },
            loadContext: async (id: string) => {
                return sessionStore.get(id) || []
            },
        }

        let callCount = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                callCount++
                if (callCount === 1) {
                    yield { type: 'text', text: 'Hello, I can help you code.' }
                } else if (callCount === 2) {
                    yield { type: 'text', text: 'I remember our previous turn.' }
                }
            },
        }

        const agent = new Agent({
            sessionId: 'test-session-100',
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            sessionRepository: mockRepo,
        })

        // Turn 1
        for await (const _ of runAgentLoop(agent, 'Hello!')) {
            // Intentionally consume generator events
        }

        expect(sessionStore.has('test-session-100')).toBe(true)
        const storedMsgs = sessionStore.get('test-session-100')!
        expect(storedMsgs.length).toBe(3) // system + user + assistant
        expect(storedMsgs[1].content).toBe('Hello!')
        expect(storedMsgs[2].content).toBe('Hello, I can help you code.')

        // Create new agent instance loading the same session
        const agent2 = new Agent({
            sessionId: 'test-session-100',
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            sessionRepository: mockRepo,
        })
        await agent2.loadContext()

        expect(agent2.messages.length).toBe(3)

        // Turn 2
        for await (const _ of runAgentLoop(agent2, 'Do you remember me?')) {
            // Intentionally consume generator events
        }

        const updatedMsgs = sessionStore.get('test-session-100')!
        expect(updatedMsgs.length).toBe(5)
        expect(updatedMsgs[3].content).toBe('Do you remember me?')
        expect(updatedMsgs[4].content).toBe('I remember our previous turn.')
    })

    it('forks context into an independent session without mutating the parent session', async () => {
        const sessionStore = new Map<string, any[]>()
        const mockRepo = {
            saveContext: async (id: string, msgs: any[]) => {
                sessionStore.set(id, JSON.parse(JSON.stringify(msgs)))
            },
            loadContext: async (id: string) => sessionStore.get(id) || [],
        }

        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                yield { type: 'text', text: 'Turn response' }
            },
        }

        const agent = new Agent({
            sessionId: 'parent-session',
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            sessionRepository: mockRepo,
        })

        for await (const _ of runAgentLoop(agent, 'Parent message')) {
            // Intentionally consume generator events
        }

        const forkedId = await agent.forkContext('child-session')
        expect(forkedId).toBe('child-session')
        expect(agent.sessionId).toBe('child-session')

        for await (const _ of runAgentLoop(agent, 'Child only message')) {
            // Intentionally consume generator events
        }

        const parentSaved = sessionStore.get('parent-session')!
        const childSaved = sessionStore.get('child-session')!

        expect(parentSaved.length).toBe(3) // system, parent user, parent assistant
        expect(childSaved.length).toBe(5) // system, parent user, parent assistant, child user, child assistant
    })
})
