import { loadConfig, saveConfig, getProviderConfig } from '../config'
import { MESSAGES } from '../constants/messages'
import { useCliStore } from '../store'
import { getToolSummary } from '../utils/formatters'
import { instantiateProvider } from '../utils/provider-factory'

import { getNextMsgId } from './use-agent-runner'

import type { Message, MessageBlock } from '@december/tui'

export function useAuthHandlers(
    agent: any,
    onLogin?: (onUrl?: (url: string) => void) => Promise<{ token: string; email: string | null }>,
    onLoginHeadless?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>
) {
    const {
        isAuthenticated,
        setIsAuthenticated,
        setCurrentEmail,
        setAuthMode,
        selectedProvider,
        setSelectedProvider,
        setApiKey,
        activeMessages,
        setActiveMessages,
        setStaticMessages,
        setIsStreaming,
        isStreaming,
        setHasBothAuth,
        setSettingsAuthPriority,
        setAuthMethod,
        setStaticKey,
        addToast,
    } = useCliStore()

    const handleAuthMenuSelect = async (item: any) => {
        if (item.value === 'december') {
            setAuthMode('december_login_select')
        } else if (item.value === 'december_browser') {
            setAuthMode('none')
            setIsStreaming(true)
            addToast('Opening browser to log in...', 'info')

            try {
                if (!onLogin) {
                    throw new Error('Login functionality is not provided by the host environment.')
                }
                const { token, email } = await onLogin((url: string) => {
                    setActiveMessages([
                        {
                            id: getNextMsgId(),
                            role: 'assistant',
                            blocks: [
                                {
                                    type: 'text',
                                    content: `Opening browser to log in...\n\nIf it doesn't open automatically, please click here:\n[${url}](${url})`,
                                },
                            ],
                        },
                    ])
                })
                const config = await loadConfig()
                config.decemberToken = token
                if (email) {
                    config.email = email
                    setCurrentEmail(email)
                }
                await saveConfig(config)

                const providerConfig = await getProviderConfig()
                if (providerConfig) {
                    const provider = instantiateProvider('openrouter', providerConfig.apiKey)
                    agent.setLLM(provider)
                    setIsAuthenticated(true)
                }

                addToast(MESSAGES.AUTH.LOGIN_SUCCESS_DECEMBER, 'success')
            } catch (err: any) {
                addToast(`Login failed: ${err.message}`, 'error')
            } finally {
                setIsStreaming(false)
            }
        } else if (item.value === 'december_headless') {
            setAuthMode('none')
            setIsStreaming(true)

            try {
                if (!onLoginHeadless) {
                    throw new Error(
                        'Headless login functionality is not provided by the host environment.'
                    )
                }

                const codeMsgId = getNextMsgId()
                setStaticMessages((prev) => [...prev, ...activeMessages])
                setActiveMessages([
                    {
                        id: codeMsgId,
                        role: 'assistant',
                        blocks: [{ type: 'text', content: `Generating device code...` }],
                    },
                ])

                const onCode = (code: string, uri: string) => {
                    setActiveMessages([
                        {
                            id: codeMsgId,
                            role: 'assistant',
                            blocks: [
                                {
                                    type: 'text',
                                    content: `Please open [${uri}](${uri}) on any device and enter code: \`${code}\``,
                                },
                                {
                                    type: 'text',
                                    content: 'Waiting for authorization...',
                                },
                            ],
                        },
                    ])
                }

                const { token, email } = await onLoginHeadless(onCode)

                const config = await loadConfig()
                config.decemberToken = token
                if (email) {
                    config.email = email
                    setCurrentEmail(email)
                }
                await saveConfig(config)

                const providerConfig = await getProviderConfig()
                const { getAuthStatus } = await import('../config')
                const authStatus = await getAuthStatus()

                if (providerConfig) {
                    const provider = instantiateProvider(
                        providerConfig.provider,
                        providerConfig.apiKey
                    )
                    agent.setLLM(provider)
                    setIsAuthenticated(true)
                    setAuthMethod(providerConfig.authMethod)
                    setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                    setSettingsAuthPriority(authStatus.authPriority)
                }

                setStaticMessages((prev) => [...prev, ...activeMessages])
                setActiveMessages([
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [{ type: 'text', content: MESSAGES.AUTH.LOGIN_SUCCESS_DEVICE }],
                    },
                ])
            } catch (err: any) {
                setStaticMessages((prev) => [...prev, ...activeMessages])
                setActiveMessages([
                    { id: getNextMsgId(), role: 'error', text: `Login failed: ${err.message}` },
                ])
            } finally {
                setIsStreaming(false)
            }
        } else if (item.value === 'byok') {
            setAuthMode('byok_provider')
        }
    }

    const handleModelSelect = async (item: any) => {
        if (item.value === 'loading') return
        const config = await loadConfig()
        config.activeModel = item.value
        await saveConfig(config)
        agent.modelOptions = { model: item.value }
        setAuthMode('none')
        addToast(`Model changed to ${item.value}`, 'success')
    }

    const handleProviderSelect = async (item: any) => {
        const config = await loadConfig()
        if (config.providers && config.providers[item.value]) {
            const key = config.providers[item.value]
            config.activeProvider = item.value
            await saveConfig(config)

            const llm = instantiateProvider(item.value, key)
            agent.setLLM(llm)

            const { getAuthStatus, getProviderConfig } = await import('../config')
            const authStatus = await getAuthStatus()
            const newProviderConfig = await getProviderConfig()
            if (newProviderConfig) {
                setAuthMethod(newProviderConfig.authMethod)
            }
            setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
            setSettingsAuthPriority(authStatus.authPriority)
            setIsAuthenticated(true)

            setAuthMode('none')
            addToast(`Switched active provider to ${item.value.toUpperCase()}`, 'success')
        } else {
            setSelectedProvider(item.value)
            setAuthMode('byok_key')
        }
    }

    const handleKeySubmit = async (key: string) => {
        if (isStreaming) return
        setIsStreaming(true)

        let testProvider: any
        let testModel: string | undefined

        try {
            testProvider = instantiateProvider(selectedProvider, key)
            if (
                selectedProvider !== 'openai' &&
                selectedProvider !== 'anthropic' &&
                selectedProvider !== 'google' &&
                selectedProvider !== 'gemini' &&
                selectedProvider !== 'openrouter' &&
                selectedProvider !== 'deepseek' &&
                selectedProvider !== 'groq' &&
                selectedProvider !== 'huggingface' &&
                selectedProvider !== 'moonshot' &&
                selectedProvider !== 'mistral' &&
                selectedProvider !== 'xai' &&
                selectedProvider !== 'zai'
            ) {
                testModel = 'gpt-4o'
            }

            const stream = testProvider.stream([{ role: 'user', content: 'Hi' }], [], undefined, {
                model: testModel,
            })
            await stream.next()

            const config = await loadConfig()
            config.providers[selectedProvider] = key
            config.activeProvider = selectedProvider
            config.activeModel = testModel
            await saveConfig(config)

            agent.setLLM(testProvider)
            agent.modelOptions = { model: testModel }
            setIsAuthenticated(true)

            const { getAuthStatus, getProviderConfig } = await import('../config')
            const authStatus = await getAuthStatus()
            const newProviderConfig = await getProviderConfig()
            if (newProviderConfig) {
                setAuthMethod(newProviderConfig.authMethod)
            }
            setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
            setSettingsAuthPriority(authStatus.authPriority)

            setAuthMode('none')
            setApiKey('')
            addToast(MESSAGES.AUTH.API_KEY_SAVED(selectedProvider), 'success')
        } catch (err: any) {
            const errStr = (err?.message || JSON.stringify(err) || String(err)).toLowerCase()
            if (
                errStr.includes('429') ||
                errStr.includes('quota') ||
                errStr.includes('rate limit') ||
                errStr.includes('404') ||
                errStr.includes('not found')
            ) {
                const config = await loadConfig()
                config.providers[selectedProvider] = key
                config.activeProvider = selectedProvider
                config.activeModel = testModel
                await saveConfig(config)

                agent.setLLM(testProvider)
                agent.modelOptions = { model: testModel }
                setIsAuthenticated(true)

                const { getAuthStatus, getProviderConfig } = await import('../config')
                const authStatus = await getAuthStatus()
                const newProviderConfig = await getProviderConfig()
                if (newProviderConfig) {
                    setAuthMethod(newProviderConfig.authMethod)
                }
                setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                setSettingsAuthPriority(authStatus.authPriority)

                setAuthMode('none')
                setApiKey('')
                addToast(`API Key saved for ${selectedProvider}`, 'success')
            } else {
                let cleanMessage = err?.message || String(err)
                try {
                    const parsed = JSON.parse(cleanMessage)
                    if (parsed.error?.message) {
                        cleanMessage = parsed.error.message
                        try {
                            const doubleParsed = JSON.parse(cleanMessage)
                            if (doubleParsed.error?.message) {
                                cleanMessage = doubleParsed.error.message
                            }
                        } catch {
                            // Keep original cleanMessage if double parse fails
                        }
                    } else if (parsed.message) {
                        cleanMessage = parsed.message
                    }
                } catch {
                    // Keep original raw message if JSON parse fails
                }

                setAuthMode('none')
                setApiKey('')
                addToast(`Invalid API Key for ${selectedProvider}: ${cleanMessage}`, 'error')
            }
        } finally {
            setIsStreaming(false)
        }
    }

    const handleLogoutSelect = async (value: string) => {
        const config = await loadConfig()
        let removedName = ''
        if (value === 'decemberToken') {
            config.decemberToken = undefined
            config.email = undefined
            setCurrentEmail(undefined)
            removedName = 'December Cloud Wallet'
        } else if (value.startsWith('provider:')) {
            const provider = value.split(':')[1]
            if (provider && config.providers) {
                delete config.providers[provider]
                removedName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`
                if (config.activeProvider === provider) {
                    config.activeProvider = Object.keys(config.providers)[0] || undefined
                }
            }
        }
        await saveConfig(config)
        setAuthMode('none')

        const providerConfig = await getProviderConfig()
        const { getAuthStatus } = await import('../config')
        const authStatus = await getAuthStatus()

        setIsAuthenticated(!!providerConfig)
        setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
        setSettingsAuthPriority(authStatus.authPriority)

        if (providerConfig && agent) {
            const llm = instantiateProvider(providerConfig.provider, providerConfig.apiKey)
            agent.setLLM(llm)
            setAuthMethod(providerConfig.authMethod)
        } else {
            setAuthMethod(undefined)
        }

        setStaticMessages((prev) => [...prev, ...activeMessages])
        addToast(`Removed credentials for: ${removedName}`, 'success')
    }

    const handleSessionSelect = async (item: any) => {
        setAuthMode('none')
        console.clear()
        try {
            await agent.loadContext(item.value)

            const resumedMessages: Message[] = []
            for (const msg of agent.messages) {
                if (msg.role === 'user') {
                    resumedMessages.push({ id: getNextMsgId(), role: 'user', text: msg.content })
                } else if (msg.role === 'assistant') {
                    const blocks: MessageBlock[] = []

                    if (msg.errorMessage) {
                        const { parseErrorMessage } = await import('../utils/error-parser')
                        blocks.push({
                            type: 'error',
                            error: parseErrorMessage({ message: msg.errorMessage }),
                        })
                    } else if (msg.content) {
                        blocks.push({ type: 'text', content: msg.content })
                    }

                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        for (const tc of msg.toolCalls) {
                            const toolMsg = agent.messages.find(
                                (m: any) => m.role === 'tool' && m.toolCallId === tc.id
                            )
                            const inputStr =
                                typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)
                            const hasError =
                                toolMsg &&
                                (toolMsg.content.startsWith('Error executing tool:') ||
                                    toolMsg.content.startsWith('Tool execution blocked:') ||
                                    (toolMsg.content.startsWith('Tool ') &&
                                        toolMsg.content.endsWith(' not found.')))
                            blocks.push({
                                type: 'command',
                                toolCallId: tc.id,
                                toolName: tc.name,
                                toolInput: inputStr,
                                command: getToolSummary(tc.name, inputStr),
                                status: hasError ? 'error' : 'success',
                                output: toolMsg?.content || '',
                            })
                        }
                    }

                    if (blocks.length > 0) {
                        resumedMessages.push({
                            id: getNextMsgId(),
                            role: 'assistant',
                            blocks,
                        })
                    }
                }
            }

            setStaticMessages([{ id: 'header', role: 'header' }, ...resumedMessages])
            setStaticKey((k) => k + 1) // force ink <static> to remount and render the entire array
            setActiveMessages([])
            addToast(`Resumed session: ${item.value}`, 'success')
        } catch (err: any) {
            addToast(`Failed to resume session: ${err.message}`, 'error')
        }
    }

    return {
        handleAuthMenuSelect,
        handleModelSelect,
        handleProviderSelect,
        handleKeySubmit,
        handleLogoutSelect,
        handleSessionSelect,
    }
}
