import { describe, test, expect } from 'bun:test'

import { ConversationManager } from '../../src/conversation-manager'
import { MockLLM } from '../mock-provider'

describe('ConversationManager (Unit)', () => {
    test('initializes with empty messages by default', () => {
        const manager = new ConversationManager()
        expect(manager.messages).toEqual([])
    })

    test('initializes with provided messages', () => {
        const manager = new ConversationManager([{ role: 'user', content: 'hello', id: '1' }])
        expect(manager.messages.length).toBe(1)
        expect(manager.messages[0]!.content).toBe('hello')
    })

    test('supports setting messages array directly via setter', () => {
        const manager = new ConversationManager()
        const newMsgs = [{ role: 'system', content: 'system' }] as any
        manager.messages = newMsgs
        expect(manager.messages).toEqual(newMsgs)
    })

    test('addMessage assigns ID and parentId automatically', () => {
        const manager = new ConversationManager()
        manager.addMessage({ role: 'user', content: 'first' })
        const firstMsg = manager.messages[0]!
        expect(firstMsg.id).toBeDefined()
        expect(firstMsg.parentId).toBeUndefined()
        expect(firstMsg.timestamp).toBeDefined()

        manager.addMessage({ role: 'assistant', content: 'second' })
        const secondMsg = manager.messages[1]!
        expect(secondMsg.id).toBeDefined()
        expect(secondMsg.parentId).toBe(firstMsg.id)
    })

    test('addMessage uses provided ID and parentId if given', () => {
        const manager = new ConversationManager()
        manager.addMessage({ role: 'user', content: 'first', id: 'custom-1', parentId: 'parent-0' })
        const firstMsg = manager.messages[0]!
        expect(firstMsg.id).toBe('custom-1')
        expect(firstMsg.parentId).toBe('parent-0')
    })

    test('compactIfNeeded delegates to compaction utility and returns summary', async () => {
        const manager = new ConversationManager()
        manager.addMessage({ role: 'system', content: 'system' })
        for (let i = 0; i < 25; i++) {
            manager.addMessage({ role: 'user', content: 'a'.repeat(100) })
        }

        const llm = new MockLLM()
        llm.pushResponse('Compacted Summary Text')
        const result = await manager.compactIfNeeded(llm, 10)

        expect(result.compacted).toBe(true)
        expect(result.summary).toBe('[COMPACTED HISTORY SUMMARY]\nCompacted Summary Text')
        expect(manager.messages.length).toBe(22)
    })

    test('compactIfNeeded does nothing if below limit', async () => {
        const manager = new ConversationManager()
        manager.addMessage({ role: 'system', content: 'system' })
        manager.addMessage({ role: 'user', content: 'short' })

        const llm = new MockLLM()
        const result = await manager.compactIfNeeded(llm, 1000)

        expect(result.compacted).toBe(false)
        expect(manager.messages.length).toBe(2)
    })
})
