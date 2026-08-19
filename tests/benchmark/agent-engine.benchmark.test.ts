import { getAdaptiveThinkingLevel, trimToolSchema, compactContextIfNeeded } from '@december/agent'
import { describe, expect, it } from 'bun:test'

import type { LLMProvider } from '@december/providers'
import type { AgentMessage } from '@december/shared'

describe('Agent Engine & Workflow Optimization Benchmarks', () => {
    it('benchmarks adaptive thinking classifier over 50,000 query evaluations', () => {
        const testQueries: { messages: AgentMessage[]; expected: string }[] = [
            {
                messages: [{ role: 'user', content: '/commit create pull request' }],
                expected: 'off',
            },
            {
                messages: [{ role: 'user', content: 'hello how are you' }],
                expected: 'off',
            },
            {
                messages: [{ role: 'user', content: 'find the auth repository in src' }],
                expected: 'minimal',
            },
            {
                messages: [
                    {
                        role: 'user',
                        content:
                            'refactor the database layer and fix all race conditions across concurrent sessions',
                    },
                ],
                expected: 'high',
            },
        ]

        const start = performance.now()
        for (let i = 0; i < 50000; i++) {
            const query = testQueries[i % testQueries.length]
            const level = getAdaptiveThinkingLevel(query.messages)
            if (i === 0) {
                expect(level).toBe(query.expected)
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(500) // 50,000 evaluations in under 500ms
    })

    it('benchmarks tool schema trimmer on 10,000 complex schemas', () => {
        const complexSchema = {
            type: 'object',
            description: 'Comprehensive tool parameters with nested documentation',
            properties: {
                targetPath: {
                    type: 'string',
                    description: 'Absolute path to destination file on the filesystem',
                },
                content: {
                    type: 'string',
                    description: 'Full code contents with markdown annotations',
                },
                options: {
                    type: 'object',
                    properties: {
                        overwrite: { type: 'boolean', description: 'Force overwrite flag' },
                        encoding: { type: 'string', enum: ['utf-8', 'ascii'] },
                    },
                },
            },
            required: ['targetPath', 'content'],
        }

        const start = performance.now()
        for (let i = 0; i < 10000; i++) {
            const trimmed = trimToolSchema(complexSchema)
            if (i === 0) {
                expect(trimmed).toBeDefined()
                expect(trimmed.type).toBe('object')
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(300) // 10,000 trims in under 300ms
    })

    it('benchmarks context compaction heuristic check over 5,000 turns', async () => {
        const mockLlm: LLMProvider = {
            id: 'mock-compaction-llm',
            stream: async function* () {
                yield { type: 'text', text: 'Compacted Summary' }
            },
        }

        const history: AgentMessage[] = Array.from({ length: 30 }, (_, i) => ({
            id: `msg-${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}: This is simulated dialogue representing codebase refactoring discussions and review steps.`,
            timestamp: Date.now() + i,
        }))

        const start = performance.now()
        for (let i = 0; i < 5000; i++) {
            // Below threshold check is fast and returns immediately
            const result = await compactContextIfNeeded(history as any, mockLlm, 128000)
            if (i === 0) {
                expect(result.length).toBe(30)
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(400) // 5,000 checks in under 400ms
    })
})
