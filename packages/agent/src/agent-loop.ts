import util from 'util'

import { safeParseJson } from '@december/shared'
import pRetry, { AbortError } from 'p-retry'

import { Agent } from './agent'

import type { AgentEvent, ToolCall, ToolResult } from '@december/shared'

class AsyncQueue<T> {
    private queue: T[] = []
    private resolvers: ((value: IteratorResult<T>) => void)[] = []
    private isEnded = false

    push(item: T) {
        if (this.resolvers.length > 0) {
            const resolve = this.resolvers.shift()!
            resolve({ value: item, done: false })
        } else {
            this.queue.push(item)
        }
    }

    end() {
        this.isEnded = true
        while (this.resolvers.length > 0) {
            const resolve = this.resolvers.shift()!
            resolve({ value: undefined, done: true })
        }
    }

    async *[Symbol.asyncIterator]() {
        while (true) {
            if (this.queue.length > 0) {
                yield this.queue.shift()!
            } else if (this.isEnded) {
                break
            } else {
                const result = await new Promise<IteratorResult<T>>((resolve) => {
                    this.resolvers.push(resolve)
                })
                if (result.done) break
                yield result.value
            }
        }
    }
}

function formatError(e: any): string {
    if (!e) return 'Unknown error'
    if (typeof e === 'string') return e
    if (e.originalError) return formatError(e.originalError) // p-retry aborterror
    if (e.cause) return formatError(e.cause)

    // ensure we capture the raw response data if available (axios/fetch style)
    // ensure we capture the raw response data if available (axios/fetch style)
    let rawData = e.response?.data || e.error || e

    // if it's a gemini sdk apierror, the detailed json is often stuffed into a message string
    const msgStr = e.error?.error?.message || e.error?.message || e.message || rawData?.message
    if (msgStr && typeof msgStr === 'string') {
        try {
            const parsedMessage = safeParseJson(msgStr)
            // if it's valid json, use it as the raw data
            rawData = parsedMessage
        } catch {
            // not json, just keep the original rawdata but we'll include the message string if it's the only thing we have
            if (rawData === e && !e.response && !e.error) {
                return msgStr
            }
        }
    }

    try {
        const json = JSON.stringify(rawData, null, 2)
        if (json !== '{}' && json !== '""') return json
    } catch {
        // Fall back to util.inspect
    }

    try {
        return util.inspect(rawData, { depth: 4 })
    } catch {
        // Fall back to String conversion
    }

    return String(e)
}

export async function* runAgentLoop(
    agent: Agent,
    userInput?: string
): AsyncGenerator<AgentEvent, void, unknown> {
    const eventQueue = new AsyncQueue<AgentEvent>()
    const abortController = new AbortController()
    agent.activeAbortController = abortController

    if (userInput) {
        agent.addMessage({ role: 'user', content: userInput })
        await agent.saveContext()
    }
    ;(async () => {
        try {
            eventQueue.push({ type: 'AgentStart' })
            await runOuterLoop(agent, eventQueue, abortController.signal)
            eventQueue.push({ type: 'AgentEnd' })
        } catch (e: any) {
            console.error('Agent Loop Error:', e)
            const errMsg = formatError(e)
            eventQueue.push({ type: 'AgentError', error: errMsg })
            eventQueue.push({ type: 'AgentEnd' })
        } finally {
            agent.activeAbortController = undefined
            eventQueue.end()
        }
    })()

    yield* eventQueue
}

async function runOuterLoop(agent: Agent, eventQueue: AsyncQueue<AgentEvent>, signal: AbortSignal) {
    while (!signal.aborted) {
        // run inner loop for turns
        await runInnerLoop(agent, eventQueue, signal)

        if (signal.aborted) break

        // follow up queue
        if (agent.followUpQueue.length > 0) {
            const msgs = agent.followUpQueue.drain()
            for (const msg of msgs) {
                agent.addMessage(msg)
            }
            continue // loop again with new messages
        }

        break
    }
}

async function runInnerLoop(agent: Agent, eventQueue: AsyncQueue<AgentEvent>, signal: AbortSignal) {
    let isDone = false
    let turnCount = 0

    while (!isDone && turnCount < 100 && !signal.aborted) {
        turnCount++

        // handle steering messages
        if (agent.hooks?.getSteeringMessages) {
            const steeringMessages = await agent.hooks.getSteeringMessages()
            for (const msg of steeringMessages) {
                agent.steer(msg)
            }
        }
        if (agent.steeringQueue.length > 0) {
            const msgs = agent.steeringQueue.drain()
            for (const msg of msgs) {
                agent.addMessage(msg)
            }
        }

        eventQueue.push({ type: 'TurnStart' })

        // stream assistant response
        const { assistantMessage, toolCalls, error } = await streamAssistantResponse(
            agent,
            eventQueue,
            signal
        )

        if (error || signal.aborted) {
            break
        }

        if (toolCalls.length === 0) {
            agent.addMessage({ role: 'assistant', content: assistantMessage })
            isDone = true
        } else {
            agent.addMessage({
                role: 'assistant',
                content: assistantMessage,
                toolCalls: toolCalls,
            })

            // execute tools
            await executeToolCalls(agent, toolCalls, eventQueue, signal)
        }

        await agent.saveContext()
        eventQueue.push({ type: 'TurnEnd' })

        if (agent.hooks?.prepareNextTurn) {
            const nextTurn = (await agent.hooks.prepareNextTurn()) as any
            if (nextTurn?.modelOptions)
                agent.modelOptions = { ...agent.modelOptions, ...nextTurn.modelOptions }
            if (nextTurn?.systemPrompt) agent.systemPrompt = nextTurn.systemPrompt
        }

        if (agent.hooks?.shouldStopAfterTurn) {
            const shouldStop = await agent.hooks.shouldStopAfterTurn()
            if (shouldStop) isDone = true
        }
    }
}

async function streamAssistantResponse(
    agent: Agent,
    eventQueue: AsyncQueue<AgentEvent>,
    signal: AbortSignal
): Promise<{ assistantMessage: string; toolCalls: ToolCall[]; error?: string }> {
    let assistantMessage = ''
    let toolCalls: ToolCall[] = []

    try {
        const retryPromise = pRetry(
            async () => {
                assistantMessage = ''
                toolCalls = []
                if (signal.aborted) throw new AbortError(new Error('Aborted'))

                const compactionResult = await agent.conversation.compactIfNeeded(
                    agent.llm,
                    undefined,
                    agent.modelOptions,
                    signal
                )

                if (compactionResult.compacted) {
                    eventQueue.push({
                        type: 'ContextCompacted',
                        summary: compactionResult.summary || '',
                    })
                }
                const toolsArray = Array.from(agent.tools.values()).map((t) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                }))

                const providerMessages = agent.convertToLlm(agent.messages) as any

                const providerModelOptions = {
                    ...agent.modelOptions,
                    thinkingLevel: agent.thinkingLevel,
                }

                const generator = agent.llm.stream(
                    providerMessages,
                    toolsArray,
                    agent.systemPrompt,
                    providerModelOptions,
                    signal
                )

                const activeToolCalls = new Map<
                    string,
                    { id: string; name: string; input: string }
                >()

                for await (const chunk of generator) {
                    if (signal.aborted) throw new AbortError(new Error('Aborted'))
                    if (chunk.type === 'text') {
                        assistantMessage += chunk.text
                        eventQueue.push({ type: 'StreamChunk', content: chunk.text })
                    } else if (chunk.type === 'thinking_delta') {
                        eventQueue.push({ type: 'ThinkingChunk', content: chunk.text })
                    } else if (chunk.type === 'tool_call_delta') {
                        if (!activeToolCalls.has(chunk.id)) {
                            activeToolCalls.set(chunk.id, {
                                id: chunk.id,
                                name: chunk.name || '',
                                input: '',
                            })
                        }
                        const tc = activeToolCalls.get(chunk.id)!
                        if (chunk.inputDelta) {
                            tc.input += chunk.inputDelta
                        }
                    } else if (chunk.type === 'tool_call') {
                        activeToolCalls.set(chunk.toolCall.id, chunk.toolCall)
                    } else if (chunk.type === 'usage') {
                        eventQueue.push({
                            type: 'AgentUsage',
                            promptTokens: chunk.promptTokens,
                            completionTokens: chunk.completionTokens,
                        })
                    }
                }
                toolCalls = Array.from(activeToolCalls.values())
                return { assistantMessage, toolCalls }
            },
            {
                retries: 5,
                factor: 2,
                minTimeout: 2000,
                maxTimeout: 30000,
                signal,
                onFailedAttempt: (error: any) => {
                    if (
                        error.status === 429 ||
                        error.message?.includes('429') ||
                        error.message?.toLowerCase().includes('quota') ||
                        error.message?.toLowerCase().includes('rate limit')
                    ) {
                        const delaySeconds = Math.round(Math.pow(2, error.attemptNumber - 1) * 2)
                        eventQueue.push({
                            type: 'AgentStatus',
                            message: `Rate limit hit, waiting ~${delaySeconds}s to retry... (${error.retriesLeft} retries left)`,
                        })
                    } else {
                        const errStr = formatError(error)
                        throw new AbortError(errStr)
                    }
                },
            }
        )

        const abortPromise = new Promise<{ assistantMessage: string; toolCalls: ToolCall[] }>(
            (_, reject) => {
                if (signal.aborted) {
                    reject(new AbortError(new Error('Aborted')))
                } else {
                    signal.addEventListener('abort', () => {
                        reject(new AbortError(new Error('Aborted')))
                    })
                }
            }
        )

        const result = await Promise.race([retryPromise, abortPromise])
        assistantMessage = result.assistantMessage
        toolCalls = result.toolCalls

        eventQueue.push({ type: 'AgentStatus', message: '' }) // clear status on success
        return { assistantMessage, toolCalls }
    } catch (error: any) {
        let errorMsg = formatError(error)

        if (signal.aborted || (error.name === 'AbortError' && errorMsg === 'Aborted')) {
            eventQueue.push({ type: 'AgentInterrupt' })
            agent.addMessage({
                role: 'assistant',
                content: assistantMessage + `\n\nInterrupted · What should December do instead?`,
                isUI: true,
            })
            await agent.saveContext()
            return { assistantMessage, toolCalls, error: 'Aborted' }
        }

        if (
            errorMsg.includes('429') ||
            errorMsg.toLowerCase().includes('quota') ||
            errorMsg.toLowerCase().includes('rate limit')
        ) {
            errorMsg =
                'Rate limit exhausted after multiple retries. Please wait a few minutes or provide a different API key.\n\n' +
                errorMsg
        }

        eventQueue.push({ type: 'AgentError', error: errorMsg })

        agent.addMessage({
            role: 'assistant',
            content: `Failed due to API error: ${errorMsg}`,
            isUI: true,
            errorMessage: errorMsg,
        })
        await agent.saveContext()
        return { assistantMessage, toolCalls, error: errorMsg }
    }
}

async function executeToolCalls(
    agent: Agent,
    toolCalls: ToolCall[],
    eventQueue: AsyncQueue<AgentEvent>,
    signal: AbortSignal
) {
    const isSequentialBatch = toolCalls.some((tc) => {
        const tool = agent.tools.get(tc.name)
        return (
            tool?.executionMode === 'sequential' ||
            ['bash', 'write_file', 'edit_file', 'edit_diff'].includes(tc.name)
        )
    })

    if (isSequentialBatch) {
        await executeToolCallsSequential(agent, toolCalls, eventQueue, signal)
    } else {
        await executeToolCallsParallel(agent, toolCalls, eventQueue, signal)
    }
}

async function executeSingleTool(
    agent: Agent,
    toolCall: ToolCall,
    eventQueue: AsyncQueue<AgentEvent>,
    signal: AbortSignal
): Promise<{ toolCall: ToolCall; toolResult: ToolResult; resultStr: string; errorStr?: string }> {
    eventQueue.push({ type: 'ToolCallStart', toolCall })

    const tool = agent.tools.get(toolCall.name)
    let resultStr = ''
    let errorStr = undefined

    if (agent.operations.ui?.requestPermission) {
        const hookRes = await agent.operations.ui.requestPermission(toolCall)
        if (hookRes?.block) {
            errorStr = `Tool execution blocked: ${hookRes.reason || 'No reason provided'}`
            const res = { toolCallId: toolCall.id, result: '', error: errorStr }
            eventQueue.push({ type: 'ToolCallResult', result: res })
            return { toolCall, toolResult: res, resultStr: '', errorStr }
        }
    }

    if (!tool) {
        errorStr = `Tool ${toolCall.name} not found.`
    } else {
        try {
            let parsedArgs = toolCall.input ? safeParseJson(toolCall.input) : {}
            if (tool.prepareArguments) {
                parsedArgs = tool.prepareArguments(parsedArgs)
            }

            resultStr = await tool.execute(parsedArgs, {
                operations: agent.operations as any,
                env: agent.env,
                signal,
                onStream: (chunk) => {
                    eventQueue.push({ type: 'ToolExecutionUpdate', toolCallId: toolCall.id, chunk })
                },
            })
        } catch (e: any) {
            errorStr = `Error executing tool: ${e.message}\n`
        }
    }

    const toolResult = { toolCallId: toolCall.id, result: resultStr, error: errorStr }

    if (agent.hooks?.afterToolCall) {
        const afterRes = await agent.hooks.afterToolCall(toolCall, toolResult)
        if (afterRes) {
            if (afterRes.result !== undefined) toolResult.result = afterRes.result
            if (afterRes.error !== undefined) toolResult.error = afterRes.error
        }
    }

    eventQueue.push({ type: 'ToolCallResult', result: toolResult })
    return { toolCall, toolResult, resultStr: toolResult.result, errorStr: toolResult.error }
}

async function executeToolCallsSequential(
    agent: Agent,
    toolCalls: ToolCall[],
    eventQueue: AsyncQueue<AgentEvent>,
    signal: AbortSignal
) {
    for (const toolCall of toolCalls) {
        if (signal.aborted) break
        const r = await executeSingleTool(agent, toolCall, eventQueue, signal)

        let finalContent = r.resultStr || ''
        if (r.errorStr) {
            finalContent = `Tool execution failed: ${r.errorStr}\nPlease adjust your arguments and try again.`
        }

        agent.addMessage({
            role: 'tool',
            content: finalContent,
            toolCallId: r.toolCall.id,
        })
    }
}

async function executeToolCallsParallel(
    agent: Agent,
    toolCalls: ToolCall[],
    eventQueue: AsyncQueue<AgentEvent>,
    signal: AbortSignal
) {
    const promises = toolCalls.map((tc) => executeSingleTool(agent, tc, eventQueue, signal))
    const results = await Promise.all(promises)
    for (const r of results) {
        let finalContent = r.resultStr || ''
        if (r.errorStr) {
            finalContent = `Tool execution failed: ${r.errorStr}\nPlease adjust your arguments and try again.`
        }

        agent.addMessage({
            role: 'tool',
            content: finalContent,
            toolCallId: r.toolCall.id,
        })
    }
}
