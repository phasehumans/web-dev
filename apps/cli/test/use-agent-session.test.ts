import { describe, it, expect, beforeEach } from 'bun:test'

import { useCliStore } from '../src/store'

describe('useCliStore activeMessages handling', () => {
    beforeEach(() => {
        useCliStore.setState({
            staticMessages: [{ id: 'header', role: 'header' }],
            activeMessages: [],
            isStreaming: false,
        })
    })

    it('flushes live activeMessages from Zustand store into staticMessages after streaming', () => {
        const store = useCliStore.getState()
        const userMsg = { id: 'msg-user-1', role: 'user' as const, text: 'Hello AI' }
        const assistantMsg = {
            id: 'msg-ast-1',
            role: 'assistant' as const,
            blocks: [{ type: 'text' as const, content: 'Hello human!' }],
        }

        // 1. Initial state setup when user submits prompt
        const currentActive = useCliStore.getState().activeMessages
        store.setStaticMessages((prev) => [...prev, ...currentActive, userMsg])
        store.setActiveMessages([assistantMsg])

        expect(useCliStore.getState().staticMessages).toHaveLength(2)
        expect(useCliStore.getState().activeMessages).toHaveLength(1)

        // 2. Simulate streaming finishing: fetching live activeMessages from store and flushing to staticMessages
        const finalActive = useCliStore.getState().activeMessages
        store.setStaticMessages((prev) => [...prev, ...finalActive])
        store.setActiveMessages([])

        const finalStatic = useCliStore.getState().staticMessages
        expect(finalStatic).toHaveLength(3)
        expect(finalStatic[0].role).toBe('header')
        expect(finalStatic[1].text).toBe('Hello AI')
        expect(finalStatic[2].blocks?.[0].content).toBe('Hello human!')
        expect(useCliStore.getState().activeMessages).toHaveLength(0)
    })
})
