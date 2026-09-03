import { loadConfig, saveConfig, getProviderConfig } from '../config'
import { MESSAGES } from '../constants/messages'
import { useCliStore } from '../store'
import { getToolSummary } from '../utils/formatters'
import { getProviderModels } from '../utils/models'
import { instantiateProvider } from '../utils/provider-factory'

import { getNextMsgId } from './use-agent-runner'

import type { Message, MessageBlock } from '@december/tui'

export function useAuthHandlers(
    agent: any,
    onLogin?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>,
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
        setActiveModel,
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
        setAuthError,
        addToast,
        ollamaStatus,
        setOllamaStatus,
    } = useCliStore()

    const handleAuthMenuSelect = async (item: any) => {
        if (item.value === 'december' || item.value === 'december_headless') {
            setAuthMode('none')
            setIsStreaming(true)

            try {
                const loginFn = onLogin || onLoginHeadless
                if (!loginFn) {
                    throw new Error('Login functionality is not provided by the host environment.')
                }

                const codeMsgId = getNextMsgId()
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([
                    {
                        id: codeMsgId,
                        role: 'assistant',
                        blocks: [{ type: 'text', content: 'Generating December login code...' }],
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
                                    content: `\nPlease open [${uri}](${uri}) on any device and enter code: \`${code}\``,
                                },
                                {
                                    type: 'text',
                                    content: 'Waiting for authorization...',
                                },
                            ],
                        },
                    ])
                }

                const { token, email } = await loginFn(onCode)

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
                        providerConfig.apiKey,
                        {
                            authMethod: providerConfig.authMethod,
                            subscription: providerConfig.subscription,
                            headers: providerConfig.headers,
                            baseURL: providerConfig.baseURL,
                        }
                    )
                    agent.setLLM(provider)
                    const activeModel = providerConfig.model
                    config.activeModel = activeModel
                    await saveConfig(config)
                    agent.modelOptions = { ...agent.modelOptions, model: activeModel }
                    setActiveModel(activeModel)
                    setSelectedProvider(providerConfig.provider)
                    setIsAuthenticated(true)
                    setAuthMethod(providerConfig.authMethod)
                    setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                    setSettingsAuthPriority(authStatus.authPriority)
                }

                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: MESSAGES.AUTH.LOGIN_SUCCESS_DEVICE,
                                color: '#6EE7B7',
                            },
                        ],
                    },
                ])
            } catch (err: any) {
                let cleanMsg = err?.message || String(err)
                if (
                    cleanMsg.includes('fetch failed') ||
                    cleanMsg.includes('ECONNREFUSED') ||
                    cleanMsg.includes('ENOTFOUND') ||
                    cleanMsg.includes('Failed to fetch') ||
                    cleanMsg.includes('Unable to connect')
                ) {
                    cleanMsg = 'Unable to connect. Is the computer able to access the url?'
                }
                const errorText = `Login failed: ${cleanMsg}`
                setAuthError(errorText)
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([{ id: getNextMsgId(), role: 'error', text: errorText }])
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
        if (agent) {
            agent.modelOptions = { ...agent.modelOptions, model: item.value }
        }
        setActiveModel(item.value)
        setAuthMode('none')
        addToast(`Model changed to ${item.value}`, 'success')
    }

    const applyOllamaConfig = async (urlToUse: string, targetModel: string) => {
        const config = await loadConfig()
        config.providers = config.providers || {}
        config.providers['ollama'] = urlToUse
        config.activeProvider = 'ollama'
        config.activeModel = targetModel
        await saveConfig(config)

        const llm = instantiateProvider('ollama', urlToUse)
        if (agent) {
            agent.setLLM(llm)
            agent.modelOptions = { ...agent.modelOptions, model: targetModel }
        }
        setActiveModel(targetModel)

        const { getAuthStatus, getProviderConfig } = await import('../config')
        const authStatus = await getAuthStatus()
        const newProviderConfig = await getProviderConfig()
        if (newProviderConfig) {
            setAuthMethod(newProviderConfig.authMethod)
        }
        setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
        setSettingsAuthPriority(authStatus.authPriority)
        setIsAuthenticated(true)
        setSelectedProvider('ollama')
        setAuthMode('none')
        addToast(`Connected to local Ollama (${targetModel})`, 'success')
    }

    const handleProviderSelect = async (item: any) => {
        const config = await loadConfig()

        if (
            item.value === 'copilot' ||
            item.value === 'claude' ||
            item.value === 'codex' ||
            item.value === 'gemini'
        ) {
            const { verifyAndResolveSubscription, loginSubscription } =
                await import('../auth/subscriptions/subscription-manager')
            const { getDefaultModelForProvider } = await import('../utils/models')
            const { getAuthStatus, getProviderConfig } = await import('../config')

            // Step 1: Check and auto-verify local credentials if present
            const verifiedBundle = await verifyAndResolveSubscription(item.value)
            if (verifiedBundle) {
                const targetModel = getDefaultModelForProvider(item.value)
                const llm = instantiateProvider(
                    verifiedBundle.provider,
                    verifiedBundle.accessToken,
                    {
                        authMethod: 'subscription',
                        subscription: verifiedBundle,
                        baseURL: verifiedBundle.endpoint,
                    }
                )
                if (agent) {
                    agent.setLLM(llm)
                    agent.modelOptions = { ...agent.modelOptions, model: targetModel }
                }
                setActiveModel(targetModel)
                setSelectedProvider(verifiedBundle.provider)
                setIsAuthenticated(true)
                setAuthMethod('subscription')

                const authStatus = await getAuthStatus()
                setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                setSettingsAuthPriority(authStatus.authPriority)

                setAuthMode('none')
                addToast(
                    `✔ Verified local ${item.value.toUpperCase()} subscription (${verifiedBundle.subscriptionType || 'active'})`,
                    'success'
                )
                return
            }

            // Step 2: If no local credentials or verification failed, launch interactive OAuth/device flow
            setAuthMode('none')
            setIsStreaming(true)
            try {
                const codeMsgId = getNextMsgId()
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([
                    {
                        id: codeMsgId,
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: `Initiating ${item.value.toUpperCase()} subscription verification...`,
                            },
                        ],
                    },
                ])

                const onCode = (code: string, uri: string) => {
                    let promptText = `\nPlease open [${uri}](${uri}) in your browser to authorize.`
                    if (code && !code.endsWith('-AUTH')) {
                        promptText = `\nPlease open [${uri}](${uri}) on your device and enter code: \`${code}\``
                    }
                    setActiveMessages([
                        {
                            id: codeMsgId,
                            role: 'assistant',
                            blocks: [
                                {
                                    type: 'text',
                                    content: promptText,
                                },
                                {
                                    type: 'text',
                                    content:
                                        'Waiting for authorization and subscription verification...',
                                },
                            ],
                        },
                    ])
                }

                const bundle = await loginSubscription(item.value, onCode)
                const targetModel = getDefaultModelForProvider(item.value)
                const llm = instantiateProvider(bundle.provider, bundle.accessToken, {
                    authMethod: 'subscription',
                    subscription: bundle,
                    baseURL: bundle.endpoint,
                })
                if (agent) {
                    agent.setLLM(llm)
                    agent.modelOptions = { ...agent.modelOptions, model: targetModel }
                }
                setActiveModel(targetModel)
                setSelectedProvider(bundle.provider)
                setIsAuthenticated(true)
                setAuthMethod('subscription')

                const authStatus = await getAuthStatus()
                setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                setSettingsAuthPriority(authStatus.authPriority)

                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: `✔ Successfully authenticated and verified ${item.value.toUpperCase()} subscription!`,
                                color: '#6EE7B7',
                            },
                        ],
                    },
                ])
                addToast(`Connected to ${item.value.toUpperCase()} subscription`, 'success')
            } catch (err: any) {
                const errorText = `Subscription verification failed: ${err?.message || String(err)}`
                setAuthError(errorText)
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([{ id: getNextMsgId(), role: 'error', text: errorText }])
            } finally {
                setIsStreaming(false)
            }
            return
        }

        if (item.value === 'ollama') {
            const { checkOllamaStatus, getDefaultModelForProvider } =
                await import('../utils/models')
            const existingUrl =
                config.providers?.['ollama'] || process.env.OLLAMA_HOST || 'http://localhost:11434'
            const status = await checkOllamaStatus(existingUrl)
            setOllamaStatus({ ...status, baseUrl: existingUrl })

            if (status.running && status.compatibleModels.length > 0) {
                const targetModel =
                    status.compatibleModels[0] || getDefaultModelForProvider('ollama')
                await applyOllamaConfig(existingUrl, targetModel)
            } else {
                setSelectedProvider('ollama')
                setAuthMode('ollama_setup')
            }
            return
        }

        if (config.providers && config.providers[item.value]) {
            const key = config.providers[item.value]
            config.activeProvider = item.value

            const { getDefaultModelForProvider } = await import('../utils/models')
            const targetModel = getDefaultModelForProvider(item.value)
            config.activeModel = targetModel
            await saveConfig(config)

            const llm = instantiateProvider(item.value, key)
            if (agent) {
                agent.setLLM(llm)
                agent.modelOptions = { ...agent.modelOptions, model: targetModel }
            }
            setActiveModel(targetModel)

            const { getAuthStatus, getProviderConfig } = await import('../config')
            const authStatus = await getAuthStatus()
            const newProviderConfig = await getProviderConfig()
            if (newProviderConfig) {
                setAuthMethod(newProviderConfig.authMethod)
            }
            setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
            setSettingsAuthPriority(authStatus.authPriority)
            setIsAuthenticated(true)
            setSelectedProvider(item.value)

            setAuthMode('none')
            addToast(
                `Switched active provider to ${item.value.toUpperCase()} (${targetModel})`,
                'success'
            )
        } else {
            setSelectedProvider(item.value)
            setAuthError(null)
            setAuthMode('byok_key')
        }
    }

    const handleKeySubmit = async (key: string) => {
        if (isStreaming) return
        const trimmedKey = key.trim()
        if (!trimmedKey) return

        setIsStreaming(true)
        setAuthError(null)

        let testProvider: any
        let testModel: string | undefined

        try {
            testProvider = instantiateProvider(selectedProvider, trimmedKey)
            const providerModels = getProviderModels(selectedProvider)
            const candidateModels =
                providerModels && providerModels.length > 0
                    ? providerModels.map((m) => m.value)
                    : ['gpt-4o']

            let lastProbeErr: any
            let probeSuccess = false

            for (const modelToTest of candidateModels.slice(0, 4)) {
                testModel = modelToTest
                const probeAbortController = new AbortController()
                const probeTimeout = setTimeout(() => {
                    probeAbortController.abort(
                        new Error('Connection timed out while verifying API key.')
                    )
                }, 10000)

                try {
                    const stream = testProvider.stream(
                        [{ role: 'user', content: 'Hi' }],
                        [],
                        undefined,
                        {
                            model: testModel,
                            max_tokens: 16,
                        },
                        probeAbortController.signal
                    )
                    try {
                        await stream.next()
                        probeSuccess = true
                        break
                    } finally {
                        clearTimeout(probeTimeout)
                        probeAbortController.abort()
                        await stream.return?.()
                    }
                } catch (probeErr: any) {
                    lastProbeErr = probeErr
                    const errText = (probeErr?.message || String(probeErr)).toLowerCase()
                    if (
                        errText.includes('401') ||
                        errText.includes('unauthorized') ||
                        errText.includes('invalid api key') ||
                        errText.includes('incorrect api key')
                    ) {
                        throw probeErr
                    }
                }
            }

            if (!probeSuccess && lastProbeErr) {
                throw lastProbeErr
            }

            const { getDefaultModelForProvider } = await import('../utils/models')
            const finalModel = testModel || getDefaultModelForProvider(selectedProvider)

            const config = await loadConfig()
            config.providers[selectedProvider] = trimmedKey
            config.activeProvider = selectedProvider
            config.activeModel = finalModel
            await saveConfig(config)

            if (agent) {
                agent.setLLM(testProvider)
                agent.modelOptions = { ...agent.modelOptions, model: finalModel }
            }
            setActiveModel(finalModel)
            setIsAuthenticated(true)
            setSelectedProvider(selectedProvider)

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
            const isTimeout =
                err?.name === 'AbortError' ||
                errStr.includes('aborted') ||
                errStr.includes('timed out') ||
                errStr.includes('timeout')
            const isLowCredit =
                errStr.includes('402') ||
                errStr.includes('credits') ||
                errStr.includes('payment') ||
                errStr.includes('afford')

            if (
                errStr.includes('429') ||
                errStr.includes('quota') ||
                errStr.includes('rate limit') ||
                errStr.includes('404') ||
                errStr.includes('not found') ||
                errStr.includes('503') ||
                errStr.includes('无可用渠道') ||
                errStr.includes('no available channel') ||
                isLowCredit
            ) {
                const { getDefaultModelForProvider } = await import('../utils/models')
                const finalModel = testModel || getDefaultModelForProvider(selectedProvider)

                const config = await loadConfig()
                config.providers[selectedProvider] = trimmedKey
                config.activeProvider = selectedProvider
                config.activeModel = finalModel
                await saveConfig(config)

                if (agent) {
                    agent.setLLM(testProvider)
                    agent.modelOptions = { ...agent.modelOptions, model: finalModel }
                }
                setActiveModel(finalModel)
                setIsAuthenticated(true)
                setSelectedProvider(selectedProvider)

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
                if (isLowCredit) {
                    const topUpUrl =
                        selectedProvider === 'openrouter'
                            ? ' (top up at https://openrouter.ai/settings/credits)'
                            : ''
                    addToast(
                        `API Key saved for ${selectedProvider}, but credit balance is low${topUpUrl}`,
                        'warning'
                    )
                } else {
                    addToast(`API Key saved for ${selectedProvider}`, 'success')
                }
            } else {
                let cleanMessage = err?.message || String(err)
                if (isTimeout) {
                    cleanMessage =
                        'Connection timed out while verifying API key. Please check your network connection or try again.'
                } else if (
                    cleanMessage.includes('fetch failed') ||
                    cleanMessage.includes('ECONNREFUSED') ||
                    cleanMessage.includes('ENOTFOUND') ||
                    cleanMessage.includes('Failed to fetch') ||
                    cleanMessage.includes('Unable to connect')
                ) {
                    cleanMessage = 'Unable to connect. Is the computer able to access the url?'
                } else {
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
                }

                let errorText: string
                if (isTimeout) {
                    errorText = `Login failed for ${selectedProvider}: ${cleanMessage}`
                } else if (
                    cleanMessage === 'Unable to connect. Is the computer able to access the url?'
                ) {
                    errorText = `Login failed: ${cleanMessage}`
                } else if (
                    cleanMessage.includes('401') ||
                    cleanMessage.toLowerCase().includes('unauthorized') ||
                    cleanMessage.toLowerCase().includes('invalid api key') ||
                    cleanMessage.toLowerCase().includes('incorrect api key')
                ) {
                    errorText = `Invalid API Key for ${selectedProvider}: ${cleanMessage}`
                } else {
                    errorText = `Login failed for ${selectedProvider}: ${cleanMessage}`
                }

                setAuthError(errorText)
                addToast(errorText, 'error')
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
        } else if (value.startsWith('subscription:')) {
            const provider = value.split(':')[1]
            if (provider && config.subscriptions) {
                delete config.subscriptions[provider]
                removedName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} Subscription`
                if (config.activeProvider === provider) {
                    config.activeProvider =
                        Object.keys(config.subscriptions)[0] ||
                        Object.keys(config.providers || {})[0] ||
                        undefined
                }
            }
        } else if (value.startsWith('provider:')) {
            const provider = value.split(':')[1]
            if (provider && config.providers) {
                delete config.providers[provider]
                removedName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`
                if (config.activeProvider === provider) {
                    config.activeProvider =
                        Object.keys(config.subscriptions || {})[0] ||
                        Object.keys(config.providers)[0] ||
                        undefined
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
            const llm = instantiateProvider(providerConfig.provider, providerConfig.apiKey, {
                authMethod: providerConfig.authMethod,
                subscription: providerConfig.subscription,
                headers: providerConfig.headers,
                baseURL: providerConfig.baseURL,
            })
            agent.setLLM(llm)
            config.activeModel = providerConfig.model
            await saveConfig(config)
            agent.modelOptions = { ...agent.modelOptions, model: providerConfig.model }
            setActiveModel(providerConfig.model)
            setSelectedProvider(providerConfig.provider)
            setAuthMethod(providerConfig.authMethod)
        } else {
            setActiveModel('')
            setSelectedProvider(undefined)
            setAuthMethod(undefined)
        }

        setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
        setActiveMessages([])
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

                    if (msg.errorMessage) {
                        const { parseErrorMessage } = await import('../utils/error-parser')
                        blocks.push({
                            type: 'error',
                            error: parseErrorMessage({ message: msg.errorMessage }),
                        })
                    } else if (msg.content) {
                        blocks.push({ type: 'text', content: msg.content })
                    }

                    if (blocks.length > 0) {
                        const lastResumed = resumedMessages[resumedMessages.length - 1]
                        if (lastResumed && lastResumed.role === 'assistant' && lastResumed.blocks) {
                            lastResumed.blocks.push(...blocks)
                        } else {
                            resumedMessages.push({
                                id: getNextMsgId(),
                                role: 'assistant',
                                blocks,
                            })
                        }
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

    const handleOllamaRetry = async (customUrl?: string) => {
        const urlToUse = customUrl || 'http://localhost:11434'
        const { checkOllamaStatus, getDefaultModelForProvider } = await import('../utils/models')
        const status = await checkOllamaStatus(urlToUse)
        setOllamaStatus({ ...status, baseUrl: urlToUse })

        if (status.running && status.compatibleModels.length > 0) {
            const targetModel = status.compatibleModels[0] || getDefaultModelForProvider('ollama')
            await applyOllamaConfig(urlToUse, targetModel)
        } else if (!status.running) {
            addToast(`Ollama server not reachable at ${urlToUse}`, 'error')
        } else {
            addToast('Ollama is running, but no tool-compatible models were found.', 'warning')
        }
    }

    const handleOllamaCancel = () => {
        setAuthMode('byok_provider')
    }

    const handleOllamaProceed = async (modelName?: string) => {
        const config = await loadConfig()
        const urlToUse = config.providers?.['ollama'] || 'http://localhost:11434'
        const targetModel = modelName || 'qwen2.5-coder:7b'
        await applyOllamaConfig(urlToUse, targetModel)
    }

    return {
        handleAuthMenuSelect,
        handleModelSelect,
        handleProviderSelect,
        handleKeySubmit,
        handleLogoutSelect,
        handleSessionSelect,
        handleOllamaRetry,
        handleOllamaCancel,
        handleOllamaProceed,
    }
}
