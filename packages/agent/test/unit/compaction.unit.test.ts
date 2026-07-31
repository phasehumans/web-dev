import { describe, test, expect } from 'bun:test'

import { compactContextIfNeeded } from '../../src/utils/compaction'
import { MockLLM } from '../mock-provider'

import type { Message } from '@december/shared'

describe('compactContextIfNeeded (Unit)', () => {
    test('does not compact if below threshold', async () => {
        const messages: Message[] = [
            { role: 'system', content: 'You are an agent' },
            { role: 'user', content: 'hello' },
        ]
        const llm = new MockLLM()
        const result = await compactContextIfNeeded(messages, llm, 1000)
        expect(result.length).toBe(2)
        expect(result).toEqual(messages)
    })

    test('compacts if above threshold and length > 21', async () => {
        const messages: Message[] = [{ role: 'system', content: 'You are an agent' }]
        for (let i = 0; i < 25; i++) {
            messages.push({ role: 'user', content: 'a'.repeat(100) })
        }

        const llm = new MockLLM()
        llm.pushResponse('Structured Summary Goal: Fix bugs')

        const result = await compactContextIfNeeded(messages, llm, 10)

        expect(result.length).toBe(22)
        expect(result[0]!.role).toBe('system')
        expect(result[1]!.role).toBe('system')
        expect(result[1]!.content).toContain('[COMPACTED HISTORY SUMMARY]')
        expect(result[1]!.content).toContain('Structured Summary Goal: Fix bugs')
        expect(result[2]!.role).toBe('user')
    })

    test('updates previous compacted summary if previous summary exists in middle history', async () => {
        const messages: Message[] = [
            { role: 'system', content: 'You are an agent' },
            { role: 'system', content: '[COMPACTED HISTORY SUMMARY]\nPrevious summary content' },
        ]
        for (let i = 0; i < 25; i++) {
            messages.push({
                role: 'user',
                content: 'tool message',
                toolCalls: [{ id: `tc-${i}`, name: 'bash', input: '{"cmd":"ls"}' }],
            })
        }

        const llm = new MockLLM()
        llm.pushResponse('Updated Summary Content')

        const result = await compactContextIfNeeded(messages, llm, 10)

        expect(result.length).toBe(22)
        expect(result[1]!.content).toContain('Updated Summary Content')
        expect(llm.calls.length).toBe(1)
        expect(llm.calls[0]!.messages[1]!.content).toContain('NEW conversation messages')
        expect(llm.calls[0]!.messages[1]!.content).toContain('File & Code State')
        expect(llm.calls[0]!.messages[1]!.content).toContain('Critical Context & Tracebacks')
    })

    test('uses MODEL_CONTEXT_WINDOWS when model option is provided', async () => {
        const messages: Message[] = [{ role: 'system', content: 'You are an agent' }]
        for (let i = 0; i < 25; i++) {
            messages.push({ role: 'user', content: 'a'.repeat(100) })
        }

        const llm = new MockLLM()
        // Provide model option for anthropic claude-3-5-sonnet-20241022 (200,000 tokens limit)
        // 25 * 100 char = ~625 tokens, which is well below 200,000 * 0.8 = 160,000
        const resultNoCompact = await compactContextIfNeeded(messages, llm, undefined, {
            model: 'claude-3-5-sonnet-20241022',
        })
        expect(resultNoCompact.length).toBe(26) // Not compacted because limit is large
    })

    test('does not compact if length <= 21 even if tokens exceed', async () => {
        const messages: Message[] = [{ role: 'system', content: 'You are an agent' }]
        for (let i = 0; i < 20; i++) {
            messages.push({ role: 'user', content: 'a'.repeat(100) })
        }

        const llm = new MockLLM()
        const result = await compactContextIfNeeded(messages, llm, 10)

        expect(result.length).toBe(21)
    })

    test('throws abort error if signal is aborted during compaction', async () => {
        const messages: Message[] = [{ role: 'system', content: 'You are an agent' }]
        for (let i = 0; i < 25; i++) {
            messages.push({ role: 'user', content: 'a'.repeat(100) })
        }

        const llm = new MockLLM()
        const controller = new AbortController()
        controller.abort()

        await expect(
            compactContextIfNeeded(messages, llm, 10, undefined, controller.signal)
        ).rejects.toThrow('Aborted')
    })
})
