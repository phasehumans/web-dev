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

    it('queues prompts sequentially in FIFO order and allows clearing state', () => {
        const store = useCliStore.getState()
        expect(store.queuedPrompts).toEqual([])

        store.setQueuedPrompts((prev) => [...prev, 'Second prompt'])
        store.setQueuedPrompts((prev) => [...prev, 'Third prompt'])

        expect(useCliStore.getState().queuedPrompts).toEqual(['Second prompt', 'Third prompt'])

        // Consume first queued prompt
        const nextPrompt = useCliStore.getState().queuedPrompts[0]
        store.setQueuedPrompts((prev) => prev.slice(1))

        expect(nextPrompt).toBe('Second prompt')
        expect(useCliStore.getState().queuedPrompts).toEqual(['Third prompt'])

        // Clear remaining
        store.setQueuedPrompts([])
        expect(useCliStore.getState().queuedPrompts).toEqual([])
    })

    it('contains AUTH_REQUIRED_NOTICE in messages constants matching expected prompt', async () => {
        const { AUTH_REQUIRED_NOTICE } = await import('../src/constants/messages')
        expect(AUTH_REQUIRED_NOTICE).toContain(
            'You are not logged in and have no custom API keys (BYOK) configured.'
        )
        expect(AUTH_REQUIRED_NOTICE).toContain('Please run `/login` to:')
        expect(AUTH_REQUIRED_NOTICE).toContain(
            '- Sign in with your December account (Cloud Wallet), or'
        )
        expect(AUTH_REQUIRED_NOTICE).toContain(
            '- Configure Bring Your Own Key (BYOK) for providers like OpenAI, Anthropic, Gemini, OpenRouter, etc.'
        )
    })

    it('exports clipboard and handoff utilities from @december/tui for slash command handling', async () => {
        const tui = await import('@december/tui')
        expect(typeof tui.writeToClipboard).toBe('function')
        expect(typeof tui.createWorkspaceArchive).toBe('function')
    })
})
