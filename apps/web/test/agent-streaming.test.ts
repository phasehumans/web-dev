import { describe, it, expect, beforeEach } from 'bun:test'

import { useAppStore } from '../src/app/store'

import type { Message } from '../src/features/chat/types'

describe('Native Agent Streaming & Chat Slice', () => {
    beforeEach(() => {
        useAppStore.setState({
            messages: [],
            generationPhase: null,
            isGenerating: false,
        })
    })

    it('initializes assistant message and sets status message on AgentStatus', () => {
        const assistantMsgId = 'test-msg-1'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore
            .getState()
            .setAssistantStatusMessage(assistantMsgId, 'Thinking in E2B microVM...')

        const state = useAppStore.getState()
        expect(state.messages).toHaveLength(1)
        expect(state.messages[0].statusMessage).toBe('Thinking in E2B microVM...')
        expect(state.messages[0].status).toBe('thinking')
    })

    it('streams reasoning thoughts via appendThinkingChunk in real time', () => {
        const assistantMsgId = 'test-msg-2'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore.getState().appendThinkingChunk(assistantMsgId, 'Analyzing ')
        useAppStore.getState().appendThinkingChunk(assistantMsgId, 'project dependencies...')

        const state = useAppStore.getState()
        expect(state.messages[0].thoughts).toBe('Analyzing project dependencies...')
        expect(state.messages[0].content).toBe('')
    })

    it('streams response text via appendStreamChunk without dropped tokens', () => {
        const assistantMsgId = 'test-msg-3'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore.getState().appendStreamChunk(assistantMsgId, 'I have created ')
        useAppStore.getState().appendStreamChunk(assistantMsgId, 'the required files.')

        const state = useAppStore.getState()
        expect(state.messages[0].content).toBe('I have created the required files.')
    })

    it('transitions status to building on StreamChunk and done on TurnEnd/AgentEnd', () => {
        const assistantMsgId = 'test-msg-4'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore.getState().setAssistantStatus(assistantMsgId, 'building')
        expect(useAppStore.getState().messages[0].status).toBe('building')

        useAppStore.getState().setAssistantStatus(assistantMsgId, 'done')
        expect(useAppStore.getState().messages[0].status).toBe('done')
    })

    it('applies formatted user-facing error message on AgentError', () => {
        const assistantMsgId = 'test-msg-5'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore
            .getState()
            .setAssistantError(assistantMsgId, 'Connection timeout to sandbox microVM')

        const state = useAppStore.getState()
        expect(state.messages[0].status).toBe('error')
        expect(state.messages[0].content.length).toBeGreaterThan(0)
    })
})
