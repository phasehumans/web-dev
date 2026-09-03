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

    it('maps insufficient wallet credit error messages clearly instead of generic error', () => {
        const assistantMsgId = 'credit-err-msg-1'
        const initialMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            status: 'thinking',
        }

        useAppStore.getState().setMessages([initialMsg])
        useAppStore
            .getState()
            .setAssistantError(
                assistantMsgId,
                'Insufficient wallet credits. Please add credits at https://trydecember.com/settings/billing to continue.'
            )

        const state = useAppStore.getState()
        expect(state.messages[0].status).toBe('error')
        expect(state.messages[0].content).toContain('Insufficient credits')
        expect(state.messages[0].content).not.toContain(
            'Something went wrong while generating this project'
        )
    })
})

describe('Payload Normalization Layer (normalizeAgentStreamEvent)', () => {
    it('normalizes flat and nested ThinkingChunk payloads', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        // Flat
        const flatEvt = normalizeAgentStreamEvent({
            type: 'ThinkingChunk',
            content: 'Planning step 1',
        })
        expect(flatEvt.type).toBe('ThinkingChunk')
        expect((flatEvt.data as any).content).toBe('Planning step 1')

        // Nested under data
        const nestedEvt = normalizeAgentStreamEvent({
            type: 'ThinkingChunk',
            data: { content: 'Planning step 2' },
        })
        expect(nestedEvt.type).toBe('ThinkingChunk')
        expect((nestedEvt.data as any).content).toBe('Planning step 2')

        // WireAgentEvent envelope
        const wireEvt = normalizeAgentStreamEvent({
            type: 'ThinkingChunk',
            data: { type: 'ThinkingChunk', content: 'Planning step 3' },
        })
        expect(wireEvt.type).toBe('ThinkingChunk')
        expect((wireEvt.data as any).content).toBe('Planning step 3')

        // Stringified JSON payload
        const strEvt = normalizeAgentStreamEvent(
            JSON.stringify({ type: 'ThinkingChunk', content: 'Planning step 4' })
        )
        expect(strEvt.type).toBe('ThinkingChunk')
        expect((strEvt.data as any).content).toBe('Planning step 4')
    })

    it('normalizes flat and nested StreamChunk payloads', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const flatEvt = normalizeAgentStreamEvent({
            type: 'StreamChunk',
            content: 'Hello world',
        })
        expect(flatEvt.type).toBe('StreamChunk')
        expect((flatEvt.data as any).content).toBe('Hello world')

        const nestedEvt = normalizeAgentStreamEvent({
            type: 'StreamChunk',
            data: { chunk: 'Hello again' },
        })
        expect(nestedEvt.type).toBe('StreamChunk')
        expect((nestedEvt.data as any).content).toBe('Hello again')
    })

    it('normalizes ToolCallStart with id, name, and input', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const evt = normalizeAgentStreamEvent({
            type: 'ToolCallStart',
            toolCall: { id: 'call-1', name: 'bash', input: { command: 'ls' } },
        })
        expect(evt.type).toBe('ToolCallStart')
        expect(evt.data.toolCall.id).toBe('call-1')
        expect(evt.data.toolCall.name).toBe('bash')
        expect(evt.data.toolCall.input).toEqual({ command: 'ls' })
    })

    it('normalizes ToolExecutionUpdate and TerminalData events', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const updateEvt = normalizeAgentStreamEvent({
            type: 'ToolExecutionUpdate',
            toolCallId: 'call-1',
            chunk: 'compiling...',
        })
        expect(updateEvt.type).toBe('ToolExecutionUpdate')
        expect((updateEvt.data as any).toolCallId).toBe('call-1')
        expect((updateEvt.data as any).chunk).toBe('compiling...')

        const terminalEvt = normalizeAgentStreamEvent({
            type: 'TerminalData',
            taskId: 'task-100',
            chunk: 'output stream',
        })
        expect(terminalEvt.type).toBe('ToolExecutionUpdate')
        expect((terminalEvt.data as any).toolCallId).toBe('task-100')
        expect((terminalEvt.data as any).chunk).toBe('output stream')
    })

    it('normalizes ToolCallResult with result string or object', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const resEvt = normalizeAgentStreamEvent({
            type: 'ToolCallResult',
            toolCallId: 'call-1',
            result: 'build succeeded',
        })
        expect(resEvt.type).toBe('ToolCallResult')
        expect((resEvt.data as any).toolCallId).toBe('call-1')
        expect((resEvt.data as any).output).toBe('build succeeded')

        const errEvt = normalizeAgentStreamEvent({
            type: 'ToolCallResult',
            result: { toolCallId: 'call-2', error: 'build failed' },
        })
        expect(errEvt.type).toBe('ToolCallResult')
        expect((errEvt.data as any).toolCallId).toBe('call-2')
        expect((errEvt.data as any).error).toBe('build failed')
    })

    it('normalizes FileModified events with path, action, and diff', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const fileEvt = normalizeAgentStreamEvent({
            type: 'FileModified',
            path: 'src/App.tsx',
            diff: '--- a\n+++ b\n',
            action: 'modified',
        })
        expect(fileEvt.type).toBe('FileModified')
        expect((fileEvt.data as any).path).toBe('src/App.tsx')
        expect((fileEvt.data as any).action).toBe('modified')
        expect((fileEvt.data as any).diff).toBe('--- a\n+++ b\n')
    })

    it('normalizes AgentStatus, ContextCompacted, AgentError, and AgentInterrupt', async () => {
        const { normalizeAgentStreamEvent } =
            await import('../src/features/generation/api/generation')

        const statusEvt = normalizeAgentStreamEvent({
            type: 'AgentStatus',
            message: 'Running tests...',
        })
        expect(statusEvt.type).toBe('AgentStatus')
        expect((statusEvt.data as any).message).toBe('Running tests...')

        const compactEvt = normalizeAgentStreamEvent({
            type: 'ContextCompacted',
            summary: 'Compacted 10 previous turns',
        })
        expect(compactEvt.type).toBe('ContextCompacted')
        expect((compactEvt.data as any).summary).toBe('Compacted 10 previous turns')

        const errorEvt = normalizeAgentStreamEvent({
            type: 'AgentError',
            error: 'Out of credits',
        })
        expect(errorEvt.type).toBe('AgentError')
        expect((errorEvt.data as any).error).toBe('Out of credits')

        const interruptEvt = normalizeAgentStreamEvent({
            type: 'AgentInterrupt',
        })
        expect(interruptEvt.type).toBe('AgentInterrupt')
    })
})
