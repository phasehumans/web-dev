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

    it('manages interactive ToolCall lifecycle (start, stdout stream, and result update)', () => {
        const assistantMsgId = 'test-msg-6'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])

        // 1. ToolCallStart
        useAppStore.getState().addToolCallBlock(assistantMsgId, {
            toolCallId: 'call-1',
            toolName: 'bash',
            toolInput: { command: 'npm install lucide-react' },
            status: 'running',
            output: '',
        })

        let state = useAppStore.getState()
        expect(state.messages[0].blocks).toHaveLength(1)
        expect(state.messages[0].blocks![0]).toEqual({
            type: 'command',
            toolCallId: 'call-1',
            toolName: 'bash',
            toolInput: { command: 'npm install lucide-react' },
            status: 'running',
            output: '',
        })

        // 2. ToolExecutionUpdate streaming chunks
        useAppStore.getState().appendToolCallOutput(assistantMsgId, 'call-1', 'added 1 package ')
        useAppStore.getState().appendToolCallOutput(assistantMsgId, 'call-1', 'in 1.2s')

        state = useAppStore.getState()
        const cmdBlock = state.messages[0].blocks![0]
        if (cmdBlock.type === 'command') {
            expect(cmdBlock.output).toBe('added 1 package in 1.2s')
            expect(cmdBlock.status).toBe('running')
        }

        // 3. ToolCallResult
        useAppStore.getState().updateToolCallResult(assistantMsgId, {
            toolCallId: 'call-1',
            status: 'success',
            output: 'added 1 package in 1.2s\nDone',
        })

        state = useAppStore.getState()
        const finalizedCmd = state.messages[0].blocks![0]
        if (finalizedCmd.type === 'command') {
            expect(finalizedCmd.status).toBe('success')
            expect(finalizedCmd.output).toBe('added 1 package in 1.2s\nDone')
        }
    })

    it('records file modifications with diffs via addFileChangeBlock', () => {
        const assistantMsgId = 'test-msg-7'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'building',
        }

        useAppStore.getState().setMessages([initialMsg])

        useAppStore.getState().addFileChangeBlock(assistantMsgId, {
            filePath: 'src/components/Header.tsx',
            action: 'modified',
            diff: '--- old\n+++ new\n@@ -1 +1 @@\n-<h1>Old</h1>\n+<h1>New</h1>',
        })

        const state = useAppStore.getState()
        expect(state.messages[0].blocks).toHaveLength(1)
        expect(state.messages[0].blocks![0]).toEqual({
            type: 'file_change',
            filePath: 'src/components/Header.tsx',
            action: 'modified',
            diff: '--- old\n+++ new\n@@ -1 +1 @@\n-<h1>Old</h1>\n+<h1>New</h1>',
        })
    })

    it('maintains strict chronological sequence across multi-block execution', () => {
        const assistantMsgId = 'test-msg-8'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])

        // Step 1: Reasoning thinking
        useAppStore.getState().appendThinkingChunk(assistantMsgId, 'I need to check package.json')

        // Step 2: Tool execution
        useAppStore.getState().addToolCallBlock(assistantMsgId, {
            toolCallId: 'call-read-1',
            toolName: 'read_file',
            toolInput: { path: 'package.json' },
            status: 'running',
        })
        useAppStore.getState().updateToolCallResult(assistantMsgId, {
            toolCallId: 'call-read-1',
            status: 'success',
            output: '{"name": "app"}',
        })

        // Step 3: File change
        useAppStore.getState().addFileChangeBlock(assistantMsgId, {
            filePath: 'src/App.tsx',
            action: 'created',
            diff: '+ export default function App() {}',
        })

        // Step 4: Final response text
        useAppStore
            .getState()
            .appendStreamChunk(assistantMsgId, 'I have created the App component!')

        const state = useAppStore.getState()
        const blocks = state.messages[0].blocks!
        expect(blocks).toHaveLength(4)
        expect(blocks[0].type).toBe('thinking')
        expect(blocks[1].type).toBe('command')
        expect(blocks[2].type).toBe('file_change')
        expect(blocks[3].type).toBe('text')
    })

    it('Ticket #403: updates step indicators and status messages purely from agent stream events', () => {
        const assistantMsgId = 'stream-status-msg-1'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])

        // 1. AgentStatus event updates statusMessage in real time
        useAppStore.getState().setAssistantStatusMessage(assistantMsgId, 'Planning architecture...')
        expect(useAppStore.getState().messages[0].statusMessage).toBe('Planning architecture...')
        expect(useAppStore.getState().messages[0].status).toBe('thinking')

        // 2. ToolCallStart updates lifecycle state to building with live running block
        useAppStore.getState().setAssistantStatus(assistantMsgId, 'building')
        useAppStore.getState().addToolCallBlock(assistantMsgId, {
            toolCallId: 'tool-exec-1',
            toolName: 'write_to_file',
            toolInput: { TargetFile: 'src/index.ts' },
            status: 'running',
        })
        expect(useAppStore.getState().messages[0].status).toBe('building')
        const activeBlocks = useAppStore.getState().messages[0].blocks!
        expect(activeBlocks).toHaveLength(1)
        expect((activeBlocks[0] as any).status).toBe('running')

        // 3. ToolCallResult transitions tool execution state to success
        useAppStore.getState().updateToolCallResult(assistantMsgId, {
            toolCallId: 'tool-exec-1',
            status: 'success',
            output: 'File created successfully',
        })
        expect((useAppStore.getState().messages[0].blocks![0] as any).status).toBe('success')

        // 4. Turn completion transitions status to done
        useAppStore.getState().setAssistantStatus(assistantMsgId, 'done')
        expect(useAppStore.getState().messages[0].status).toBe('done')
    })
})
