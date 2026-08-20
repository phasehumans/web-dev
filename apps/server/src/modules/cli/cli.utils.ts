import {
    geminiProvider,
    anthropicProvider,
    openaiProvider,
    openrouterProvider,
} from '@december/providers'

import { env } from '../../env'
import { AppError } from '../../shared/appError'

import type { ServerProviderResolution, ReconciledCliMessage } from './cli.types'
import type { Message, ProviderTool } from '@december/providers'

export function generateCliSessionName(): string {
    return `cli-session-${Date.now()}`
}

export function parseOpenAiChatRequest(body: any): {
    systemPrompt?: string
    messages: Message[]
    tools?: ProviderTool[]
    modelOptions: Record<string, any>
} {
    const systemMsgs: string[] = []
    const messages: Message[] = []

    if (Array.isArray(body?.messages)) {
        for (const m of body.messages) {
            if (m.role === 'system') {
                if (typeof m.content === 'string') {
                    systemMsgs.push(m.content)
                }
            } else if (m.role === 'tool') {
                messages.push({
                    role: 'tool',
                    content:
                        typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
                    toolCallId: m.tool_call_id,
                })
            } else if (m.role === 'assistant') {
                const toolCalls = Array.isArray(m.tool_calls)
                    ? m.tool_calls.map((tc: any) => ({
                          id: tc.id,
                          name: tc.function?.name || '',
                          input:
                              typeof tc.function?.arguments === 'string'
                                  ? tc.function.arguments
                                  : JSON.stringify(tc.function?.arguments || {}),
                      }))
                    : undefined
                messages.push({
                    role: 'assistant',
                    content: m.content || '',
                    toolCalls,
                })
            } else {
                messages.push({
                    role: 'user',
                    content:
                        typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
                })
            }
        }
    }

    const tools: ProviderTool[] | undefined = Array.isArray(body?.tools)
        ? body.tools.map((t: any) => ({
              name: t.function?.name || t.name,
              description: t.function?.description || t.description,
              inputSchema: t.function?.parameters || t.inputSchema || {},
          }))
        : undefined

    const systemPrompt = systemMsgs.length > 0 ? systemMsgs.join('\n\n') : undefined

    const modelOptions: Record<string, any> = {
        model: body?.model,
        temperature: body?.temperature,
        max_tokens: body?.max_tokens,
        thinkingLevel: body?.thinking_level || body?.reasoning_effort,
    }

    return { systemPrompt, messages, tools, modelOptions }
}

export const OPENROUTER_MODEL_MAP: Record<string, string> = {
    'gemini-3.7-flash': 'google/gemini-3.7-flash',
    'gemini-3.6-flash': 'google/gemini-3.6-flash',
    'gemini-3.5-flash': 'google/gemini-3.5-flash',
    'gemini-3.5-flash-lite': 'google/gemini-3.5-flash-lite',
    'gemini-2.5-flash': 'google/gemini-2.5-flash',
    'gemini-2.5-pro': 'google/gemini-2.5-pro',
    'gemini-3-pro-preview': 'google/gemini-3-pro-preview',
    'gemini-3.1-pro': 'google/gemini-3-pro-preview',
    'claude-3-7-sonnet-latest': 'anthropic/claude-3.7-sonnet',
    'claude-3-5-sonnet-latest': 'anthropic/claude-3.5-sonnet',
    'claude-3-5-haiku-latest': 'anthropic/claude-3.5-haiku',
    'claude-3-opus-latest': 'anthropic/claude-3.5-haiku',
    'o3-mini': 'openai/o3-mini',
    o1: 'openai/o1',
    'o1-mini': 'openai/o1-mini',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4.5-preview': 'openai/gpt-4.5-preview',
    'deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek-chat': 'deepseek/deepseek-chat',
}

export function resolveServerProvider(modelInput?: string): ServerProviderResolution {
    const model = (modelInput || '').trim()
    const lowerModel = model.toLowerCase()
    const strippedModel = lowerModel.includes('/') ? lowerModel.split('/').pop()! : lowerModel

    // 1. Direct Google Gemini Native Provider (@google/genai)
    const isGeminiModel = lowerModel.startsWith('gemini') || lowerModel.startsWith('google/')
    if (isGeminiModel && env.GEMINI_API_KEY) {
        return {
            provider: geminiProvider(env.GEMINI_API_KEY),
            providerName: 'gemini',
            model: strippedModel,
        }
    }

    // 2. Direct Anthropic Provider (@anthropic-ai/sdk)
    const isAnthropicModel = lowerModel.startsWith('claude') || lowerModel.startsWith('anthropic/')
    if (isAnthropicModel && env.ANTHROPIC_API_KEY) {
        return {
            provider: anthropicProvider(undefined, env.ANTHROPIC_API_KEY),
            providerName: 'anthropic',
            model: strippedModel,
        }
    }

    // 3. Direct OpenAI Provider
    const isOpenAiModel =
        lowerModel.startsWith('gpt') ||
        lowerModel.startsWith('o1') ||
        lowerModel.startsWith('o3') ||
        lowerModel.startsWith('openai/')
    if (isOpenAiModel && env.OPENAI_API_KEY) {
        return {
            provider: openaiProvider(undefined, env.OPENAI_API_KEY),
            providerName: 'openai',
            model: strippedModel,
        }
    }

    // 4. Direct DeepSeek Provider
    const isDeepSeekModel = lowerModel.startsWith('deepseek')
    if (isDeepSeekModel && env.DEEPSEEK_API_KEY) {
        return {
            provider: openaiProvider('https://api.deepseek.com', env.DEEPSEEK_API_KEY),
            providerName: 'deepseek',
            model: strippedModel,
        }
    }

    // 5. OpenRouter Gateway Fallback
    if (env.OPENROUTER_API_KEY) {
        const mappedModel =
            OPENROUTER_MODEL_MAP[model] || OPENROUTER_MODEL_MAP[strippedModel] || model
        return {
            provider: openrouterProvider(env.OPENROUTER_API_KEY),
            providerName: 'openrouter',
            model: mappedModel,
        }
    }

    throw new AppError(
        `No upstream provider API key configured for model "${model}". Please configure GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY on the server.`,
        500
    )
}

export function reconcileCliMessages(messages?: any[]): ReconciledCliMessage[] {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return []
    }

    const reconciled: ReconciledCliMessage[] = []
    let sequence = 0

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        if (!msg) continue

        const role = (msg.role || '').toLowerCase()

        if (role === 'system') {
            reconciled.push({
                role: 'SYSTEM',
                content:
                    typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content ?? ''),
                sequence: sequence++,
            })
        } else if (role === 'user') {
            reconciled.push({
                role: 'USER',
                content:
                    typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content ?? ''),
                sequence: sequence++,
            })
        } else if (role === 'assistant') {
            let blocks: any[] = []

            if (Array.isArray(msg.blocks) && msg.blocks.length > 0) {
                blocks = msg.blocks
            } else {
                if (msg.thoughts) {
                    blocks.push({
                        type: 'thinking',
                        content: msg.thoughts,
                    })
                }

                if (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
                    for (const tc of msg.toolCalls) {
                        const toolMsg = messages.find(
                            (m: any) =>
                                (m.role || '').toLowerCase() === 'tool' && m.toolCallId === tc.id
                        )
                        const output = toolMsg?.content || ''
                        const hasError =
                            Boolean(toolMsg?.isError) ||
                            Boolean(toolMsg?.error) ||
                            output.startsWith('Tool execution failed:') ||
                            output.startsWith('Error executing tool:') ||
                            output.startsWith('Tool execution blocked:')

                        let toolInput = tc.input
                        if (typeof toolInput === 'string') {
                            try {
                                toolInput = JSON.parse(toolInput)
                            } catch {
                                // Keep string as toolInput
                            }
                        }

                        blocks.push({
                            type: 'command',
                            toolCallId: tc.id,
                            toolName: tc.name,
                            toolInput,
                            status: hasError ? 'error' : 'success',
                            output,
                        })
                    }
                }

                if (msg.errorMessage) {
                    blocks.push({
                        type: 'error',
                        error: msg.errorMessage,
                    })
                } else if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
                    blocks.push({
                        type: 'text',
                        content: msg.content,
                    })
                }
            }

            reconciled.push({
                role: 'ASSISTANT',
                content: typeof msg.content === 'string' ? msg.content : '',
                blocks: blocks.length > 0 ? blocks : undefined,
                sequence: sequence++,
            })
        }
        // Standalone 'tool' messages are incorporated into the assistant message blocks above
    }

    return reconciled
}
