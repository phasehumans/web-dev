import { parseErrorMessage } from '../utils/error-parser'
import { getToolSummary } from '../utils/formatters'

import type { Message } from '@december/tui'

let msgId = 0
export function getNextMsgId() {
    return ++msgId
}

export async function processAgentStream({
    stream,
    setActiveMessages,
    assistantMsgId,
}: {
    stream: any
    setActiveMessages: any
    assistantMsgId: number
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
                    content.startsWith('Rate limit') ||
                    content.startsWith('High demand')

                for (const event of eventsToProcess) {
                    switch (event.type) {
                        case 'TurnStart':
                            blocks.push({ type: 'text', content: 'Working...' })
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
                            const statusBlock = blocks[blocks.length - 1]
                            if (
                                statusBlock &&
                                statusBlock.type === 'text' &&
                                isStatusMessage(statusBlock.content)
                            ) {
                                statusBlock.content = event.message || 'Working...'
                            } else if (event.message) {
                                blocks.push({ type: 'text', content: event.message })
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

    for await (const event of stream) {
        pendingEvents.push(event)
        if (
            event.type === 'StreamChunk' ||
            event.type === 'TextChunk' ||
            event.type === 'ThinkingChunk'
        ) {
            if (flushTimeout) {
                clearTimeout(flushTimeout)
                flushTimeout = null
            }
            flush()
        } else if (!flushTimeout) {
            flushTimeout = setTimeout(() => {
                flush()
                flushTimeout = null
            }, 16)
        }
    }

    if (flushTimeout) {
        clearTimeout(flushTimeout)
        flushTimeout = null
    }
    flush()
}
