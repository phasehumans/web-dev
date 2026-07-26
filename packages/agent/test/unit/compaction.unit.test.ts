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
        const result = await compactContextIfNeeded(messages, llm, 10)

        expect(result.length).toBe(22)
        expect(result[0]!.role).toBe('system')
        expect(result[1]!.role).toBe('system')
        expect(result[1]!.content).toContain('[COMPACTED HISTORY SUMMARY]')
        expect(result[1]!.content).toContain('default response')
        expect(result[2]!.role).toBe('user')
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
})
