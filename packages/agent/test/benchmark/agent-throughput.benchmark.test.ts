import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { getAdaptiveThinkingLevel } from '../../src/agent-loop'
import { trimToolSchema } from '../../src/utils/schema-trimmer'
import { MockLLM } from '../mock-provider'

import type { AgentMessage } from '@december/shared'

describe('Agent Performance & Throughput Benchmarks', () => {
    it('benchmarks message conversion (convertToLlm) on 5,000 messages', () => {
        const agent = new Agent({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
        })

        const messages: AgentMessage[] = []
        for (let i = 0; i < 5000; i++) {
            messages.push({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `Message content payload #${i} with some extra descriptive text`,
                isUI: i % 10 === 0,
            })
        }

        const start = performance.now()
        const converted = agent.convertToLlm(messages)
        const duration = performance.now() - start

        expect(converted.length).toBe(4500)
        expect(duration).toBeLessThan(50) // should easily complete under 50ms for 5,000 messages
    })

    it('benchmarks adaptive thinking classification on 10,000 queries', () => {
        const sampleQueries = [
            'hi',
            '/help',
            'read the config file',
            'refactor authentication service',
            'what is the port number',
            'debug memory leak in websocket server',
            'short',
            'add helper function',
        ]

        const messagesList: AgentMessage[][] = []
        for (let i = 0; i < 10000; i++) {
            messagesList.push([{ role: 'user', content: sampleQueries[i % sampleQueries.length]! }])
        }

        const start = performance.now()
        for (let i = 0; i < 10000; i++) {
            getAdaptiveThinkingLevel(messagesList[i]!)
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(100) // 10,000 classifications in < 100ms
    })

    it('benchmarks tool schema trimming on 1,000 complex schemas', () => {
        const schema = {
            type: 'object',
            description: 'Top-level schema description',
            title: 'ConfigSchema',
            properties: {
                name: { type: 'string', description: 'Name of property', title: 'PropName' },
                count: { type: 'number', description: 'Count item', title: 'Count' },
                nested: {
                    type: 'object',
                    description: 'Nested object description',
                    properties: {
                        inner: { type: 'string', description: 'Inner description' },
                    },
                },
            },
            required: ['name'],
        }

        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            trimToolSchema(schema)
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(100)
    })
})
