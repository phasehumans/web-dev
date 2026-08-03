import { parseErrorMessage } from '../utils/error-parser'
import { getToolSummary } from '../utils/formatters'

import type { Message } from '@december/tui'

let msgIdCounter = 0
export function getNextMsgId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${++msgIdCounter}`
}

export async function processAgentStream({
    stream,
    setActiveMessages,
    assistantMsgId,
}: {
    stream: any
    setActiveMessages: any
    assistantMsgId: string | number
}) {
    let pendingEvents: any[] = []
    let flushTimeout: NodeJS.Timeout | null = null

    const flush = () => {
        if (pendingEvents.length === 0) return

        const eventsToProcess = [...pendingEvents]
        pendingEvents = []

        setActiveMessages((prev: Message[]) =>
            prev.map((msg) => {
                if (msg.id !== assistantMsgId) return msg
                const blocks = [...(msg.blocks || [])]
                let finalMsg = { ...msg }

                const isStatusMessage = (content: string) =>
                    content === 'Working...' ||
                    content === 'Thinking...' ||
                    content === 'Connecting...' ||
                    content === 'Preparing...' ||
                    content === 'Compacting...' ||
                    content === 'Generating...' ||
                    content.startsWith('Rate limit') ||
                    content.startsWith('High demand') ||
                    content.startsWith('LLM Provider rate limit') ||
                    content.startsWith('LLM Provider high demand')

                for (const event of eventsToProcess) {
                    switch (event.type) {
                        case 'TurnStart':
                            blocks.push({ type: 'text', content: 'Connecting...' })
                            break
                        case 'AgentError': {
                            const lastBlock = blocks[blocks.length - 1]
                            if (
                                lastBlock &&
                                (lastBlock.type === 'thinking' ||
                                    (lastBlock.type === 'text' &&
                                        isStatusMessage(lastBlock.content)))
                            ) {
                                blocks.pop()
                            }
                            const errMsg = parseErrorMessage({ message: event.error })
                            blocks.push({
                                type: 'error',
                                error: errMsg,
                            })
                            break
                        }
                        case 'AgentInterrupt': {
                            const lastBlock = blocks[blocks.length - 1]
                            if (
                                lastBlock &&
                                lastBlock.type === 'text' &&
                                isStatusMessage(lastBlock.content)
                            ) {
                                lastBlock.content = ''
                            }
                            blocks.push({ type: 'interrupt' })
                            break
                        }
                        case 'AgentStatus': {
                            const isRetryStatus =
                                event.message?.startsWith('LLM Provider') ||
                                event.message?.startsWith('Rate limit') ||
                                event.message?.startsWith('High demand')
                            const color = isRetryStatus ? '#FCA5A5' : undefined

                            const statusBlock = blocks[blocks.length - 1]
                            if (
                                statusBlock &&
                                statusBlock.type === 'text' &&
                                isStatusMessage(statusBlock.content)
                            ) {
                                statusBlock.content = event.message || 'Working...'
                                if (color) statusBlock.color = color
                            } else if (event.message) {
                                blocks.push({ type: 'text', content: event.message, color })
                            }
                            break
                        }
                        case 'ContextCompacted': {
                            blocks.push({ type: 'compaction', summary: event.summary })
                            break
                        }
                        case 'StreamChunk': {
                            const lastBlock = blocks[blocks.length - 1]
                            if (lastBlock && lastBlock.type === 'text') {
                                lastBlock.content =
                                    (isStatusMessage(lastBlock.content) ? '' : lastBlock.content) +
                                    event.content
                            } else {
                                blocks.push({ type: 'text', content: event.content })
                            }
                            break
                        }
                        case 'ThinkingChunk': {
                            const lastThinkBlock = blocks[blocks.length - 1]
                            if (lastThinkBlock && lastThinkBlock.type === 'thinking') {
                                lastThinkBlock.content += event.content
                            } else {
                                if (
                                    blocks.length > 0 &&
                                    blocks[blocks.length - 1].type === 'text' &&
                                    isStatusMessage(blocks[blocks.length - 1].content)
                                ) {
                                    blocks.pop()
                                }
                                blocks.push({ type: 'thinking', content: event.content })
                            }
                            break
                        }
                        case 'ToolCallStart':
                            blocks.push({
                                type: 'command',
                                toolCallId: event.toolCall.id,
                                toolName: event.toolCall.name,
                                toolInput: event.toolCall.input,
                                command: getToolSummary(event.toolCall.name, event.toolCall.input),
                                status: 'running',
                                output: '',
                            })
                            break
                        case 'ToolExecutionUpdate': {
                            const runningCmd = blocks.find(
                                (b: any) =>
                                    b.type === 'command' && b.toolCallId === event.toolCallId
                            ) as any
                            if (runningCmd && runningCmd.status === 'running') {
                                runningCmd.output += event.chunk
                            }
                            break
                        }
                        case 'ToolCallResult': {
                            const lastCmd = blocks.find(
                                (b: any) =>
                                    b.type === 'command' && b.toolCallId === event.result.toolCallId
                            ) as any
                            if (lastCmd) {
                                lastCmd.status = event.result.error ? 'error' : 'success'
                                lastCmd.output = event.result.error || event.result.result
                            }
                            break
                        }
                        case 'AgentUsage': {
                            finalMsg = {
                                ...finalMsg,
                                usage: {
                                    promptTokens: (event as any).promptTokens,
                                    completionTokens: (event as any).completionTokens,
                                },
                            } as any
                            break
                        }
                    }
                }
                return { ...finalMsg, blocks }
            })
        )
    }

    const FRAME_BUDGET_MS = 33 // ~30 FPS frame budget for terminal rendering

    for await (const event of stream) {
        pendingEvents.push(event)

        const isImmediateEvent =
            event.type === 'TurnStart' ||
            event.type === 'AgentError' ||
            event.type === 'AgentInterrupt' ||
            event.type === 'ToolCallStart' ||
            event.type === 'ToolCallResult'

        if (isImmediateEvent) {
            if (flushTimeout) {
                clearTimeout(flushTimeout)
                flushTimeout = null
            }
            flush()
        } else if (!flushTimeout) {
            flushTimeout = setTimeout(() => {
                flush()
                flushTimeout = null
            }, FRAME_BUDGET_MS)
        }
    }

    if (flushTimeout) {
        clearTimeout(flushTimeout)
    }
    flush()
}
