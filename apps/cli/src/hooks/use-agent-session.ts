import { Agent, runAgentLoop } from '@december/agent'
import { loadCustomCommands, interpolateCommandPrompt } from '@december/shared'
import { useEffect, useCallback, useState, useRef } from 'react'

import { loadConfig, saveConfig } from '../config'
import {
    AUTH_REQUIRED_NOTICE,
    HANDOFF_LOGIN_REQUIRED_NOTICE,
    HANDOFF_INSUFFICIENT_CREDITS_NOTICE,
    HANDOFF_SUCCESS_NOTICE,
} from '../constants/messages'
import { getGrillPrompt, getPlanPrompt } from '../constants/prompts'
import { useCliStore } from '../store'
import { setupAgentInterceptors } from '../store/interceptors'
import { taskManager } from '../task-manager'
import { startDirectCommand } from '../utils/direct-shell'
import { parseErrorMessage } from '../utils/error-parser'
import { extractJsonArray } from '../utils/json-parser'
import { getProviderModels } from '../utils/models'
import { fetchOpenRouterModels } from '../utils/openrouter-models'
import { instantiateProvider } from '../utils/provider-factory'
import { formatUsageCard } from '../utils/usage-rates'

import { getNextMsgId, processAgentStream } from './use-agent-runner'
import { useAuthHandlers } from './use-auth-handlers'
import { useSettingsHandlers } from './use-settings-handlers'

import type { Message } from '@december/tui'

// formatters and msgid extracted

export function useAgentSession({
    agent,
    isAuthenticated: initialAuth,
    authMethod: initialAuthMethod,
    hasBothAuth: initialHasBothAuth,
    settingsAuthPriority: initialSettingsAuthPriority,
    cliVersion,
    userEmail,
    sessionRepository,
    onLogin,
    onLoginHeadless,
}: {
    agent: Agent
    isAuthenticated: boolean
    authMethod?: 'byok' | 'december' | 'env' | 'subscription'
    hasBothAuth?: boolean
    settingsAuthPriority?: 'byok' | 'december' | 'subscription'
    cliVersion?: string
    userEmail?: string
    sessionRepository?: any
    onLogin?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>
    onLoginHeadless?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>
}) {
    const state = useCliStore()
    const {
        isAuthenticated,
        setIsAuthenticated,
        authMethod,
        setAuthMethod,
        hasBothAuth,
        setHasBothAuth,
        settingsAuthPriority,
        setSettingsAuthPriority,
        currentEmail,
        setCurrentEmail,
        authMode,
        setAuthMode,
        logoutItems,
        setLogoutItems,
        selectedProvider,
        setSelectedProvider,
        activeModel,
        setActiveModel,
        apiKey,
        setApiKey,
        authError,
        setAuthError,
        openRouterModels,
        setOpenRouterModels,
        ollamaStatus,
        setOllamaStatus,
        ollamaModels,
        setOllamaModels,
        currentPlannedPrompt,
        setCurrentPlannedPrompt,
        grillMode,
        setGrillMode,
        grillQuestions,
        setGrillQuestions,
        currentGrillIndex,
        setCurrentGrillIndex,
        grillAnswers,
        setGrillAnswers,
        grillPrompt,
        setGrillPrompt,
        customInputMode,
        setCustomInputMode,
        customAnswer,
        setCustomAnswer,
        staticMessages,
        setStaticMessages,
        staticKey,
        setStaticKey,
        activeMessages,
        setActiveMessages,
        isStreaming,
        setIsStreaming,
        queuedPrompts,
        setQueuedPrompts,
        pendingQuestions,
        setPendingQuestions,
        pendingToolCall,
        setPendingToolCall,
        toasts,
        addToast,
        setShouldExit,
        tasksData,
        setTasksData,
        taskSelectedIndex,
        setTaskSelectedIndex,
        taskViewingId,
        setTaskViewingId,
        taskScrollOffset,
        setTaskScrollOffset,
        sessionRenameMode,
        setSessionRenameMode,
        sessionNewName,
        setSessionNewName,
        sessionItems,
        setSessionItems,
        sessionsData,
        setSessionsData,
        sessionPage,
        setSessionPage,
        sessionSelectedIndex,
        setSessionSelectedIndex,

        settingsNonWorkspace,
        setSettingsNonWorkspace,
        settingsToolPermission,
        setSettingsToolPermission,
        settingsCompactMode,
        setSettingsCompactMode,
        settingsSoundEffects,
        setSettingsSoundEffects,
        settingsAutoScroll,
        setSettingsAutoScroll,
        settingsStreamSpeed,
        setSettingsStreamSpeed,
        settingsSelectedIndex,
        setSettingsSelectedIndex,
        settingsDefaultModel,
        setSettingsDefaultModel,
        settingsMaxTokens,
        setSettingsMaxTokens,
        settingsThinkingLevel,
        setSettingsThinkingLevel,
        settingsSteeringMode,
        setSettingsSteeringMode,
        settingsFollowUpMode,
        setSettingsFollowUpMode,
    } = state

    const [expandCommands, setExpandCommands] = useState(false)
    const toggleExpandCommands = useCallback(() => {
        setExpandCommands((prev) => !prev)
    }, [])

    const [detectedSubscriptions, setDetectedSubscriptions] = useState<Record<string, any>>({})

    useEffect(() => {
        import('../auth/subscriptions/subscription-manager')
            .then(({ detectAllSubscriptions }) => detectAllSubscriptions())
            .then((detected) => {
                if (detected) setDetectedSubscriptions(detected)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        useCliStore.setState((prev) => ({
            ...prev,
            isAuthenticated: initialAuth,
            authMethod: initialAuthMethod,
            hasBothAuth: initialHasBothAuth !== undefined ? initialHasBothAuth : prev.hasBothAuth,
            settingsAuthPriority:
                initialSettingsAuthPriority !== undefined
                    ? initialSettingsAuthPriority
                    : prev.settingsAuthPriority,
            currentEmail: userEmail !== undefined ? userEmail : prev.currentEmail,
        }))
    }, [initialAuth, initialAuthMethod, initialHasBothAuth, initialSettingsAuthPriority, userEmail])

    useEffect(() => {
        if (agent) {
            setupAgentInterceptors(agent, {
                setAuthMode,
                setPendingQuestions,
                setPendingToolCall,
            })
        }
    }, [agent, setAuthMode, setPendingQuestions, setPendingToolCall])

    const activeShellAbortRef = useRef<(() => void) | null>(null)

    // hooks state

    useEffect(() => {
        if (authMode === 'tasks_mode') {
            const update = () => {
                setTasksData([...taskManager.getTasks()])
            }
            update()
            const interval = setInterval(update, 500)
            return () => clearInterval(interval)
        }
    }, [authMode, setTasksData])

    useEffect(() => {
        if (selectedProvider === 'openrouter' || authMode === 'model_select') {
            loadConfig().then((config) => {
                if (config.activeProvider === 'openrouter' || selectedProvider === 'openrouter') {
                    const apiKey = config.providers?.openrouter || process.env.OPENROUTER_API_KEY
                    fetchOpenRouterModels(apiKey).then((models) => {
                        setOpenRouterModels(models)
                    })
                }
            })
        }
    }, [authMode, selectedProvider, setOpenRouterModels])

    const handleKillTask = useCallback(
        (taskId: string) => {
            taskManager.killTask(taskId)
            setTasksData([...taskManager.getTasks()])
        },
        [setTasksData]
    )

    const generateGrillQuestions = useCallback(
        async (userPrompt: string) => {
            const trimmedPrompt = userPrompt.trim()
            const displayPrompt = trimmedPrompt.startsWith('/')
                ? trimmedPrompt
                : `/grill ${trimmedPrompt}`

            if (!isAuthenticated) {
                const userMsg: Message = {
                    id: getNextMsgId(),
                    role: 'user',
                    text: displayPrompt,
                }
                const noticeMsg: Message = {
                    id: getNextMsgId(),
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: AUTH_REQUIRED_NOTICE,
                        },
                    ],
                }
                setStaticMessages((prev) => [
                    ...prev,
                    ...useCliStore.getState().activeMessages,
                    userMsg,
                    noticeMsg,
                ])
                setActiveMessages([])
                return
            }

            setIsStreaming(true)
            const userMsgId = getNextMsgId()
            const assistantMsgId = getNextMsgId()

            setStaticMessages((prev) => [
                ...prev,
                ...useCliStore.getState().activeMessages,
                { id: userMsgId, role: 'user', text: displayPrompt },
            ])
            setActiveMessages([
                {
                    id: assistantMsgId,
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: 'Analyzing prompt...',
                        },
                    ],
                },
            ])

            try {
                const prompt = getGrillPrompt(trimmedPrompt)

                const stream = agent.llm.stream(
                    [{ role: 'user', content: prompt }],
                    undefined,
                    undefined,
                    agent.modelOptions
                )
                let accumulatedText = ''
                for await (const chunk of stream) {
                    if (chunk.type === 'text') {
                        accumulatedText += chunk.text
                        setActiveMessages((prev) =>
                            prev.map((msg) => {
                                if (msg.id !== assistantMsgId) return msg
                                return {
                                    ...msg,
                                    blocks: [
                                        {
                                            type: 'text',
                                            content: 'Generating questions...',
                                        },
                                    ],
                                }
                            })
                        )
                    }
                }

                const questions = extractJsonArray(accumulatedText)
                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error('Invalid questions format returned from model.')
                }

                setGrillQuestions(questions)
                setGrillPrompt(trimmedPrompt)
                setGrillAnswers([])
                setCurrentGrillIndex(0)
                setAuthMode('grill_question')
                setCustomInputMode(false)

                setActiveMessages([])
            } catch (err: any) {
                const cleanError = parseErrorMessage(err)
                const isAuthErr =
                    cleanError.includes('401') ||
                    cleanError.includes('dummy-key') ||
                    cleanError.toLowerCase().includes('incorrect api key') ||
                    cleanError.toLowerCase().includes('invalid api key') ||
                    cleanError.toLowerCase().includes('unauthorized')

                if (isAuthErr) {
                    setActiveMessages([])
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: AUTH_REQUIRED_NOTICE,
                            },
                        ],
                    }
                    setStaticMessages((prev) => [...prev, noticeMsg])
                } else {
                    setActiveMessages([])
                    const errorMsg: Message = {
                        id: getNextMsgId(),
                        role: 'error',
                        text: cleanError,
                    }
                    setStaticMessages((prev) => [...prev, errorMsg])
                }
            } finally {
                setIsStreaming(false)
            }
        },
        [
            agent,
            isAuthenticated,
            setActiveMessages,
            setAuthMode,
            setCurrentGrillIndex,
            setCustomInputMode,
            setGrillAnswers,
            setGrillPrompt,
            setGrillQuestions,
            setIsStreaming,
            setStaticMessages,
        ]
    )

    const generatePlanFromGrill = useCallback(
        async (answers: string[]) => {
            setAuthMode('none')
            const originalPrompt = grillPrompt
            setGrillPrompt(null)
            setGrillQuestions([])
            setGrillAnswers([])

            if (!originalPrompt) return

            if (!isAuthenticated) {
                const userMsg: Message = {
                    id: getNextMsgId(),
                    role: 'user',
                    text: `Generate plan from grill interview for: "${originalPrompt}"`,
                }
                const noticeMsg: Message = {
                    id: getNextMsgId(),
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: AUTH_REQUIRED_NOTICE,
                        },
                    ],
                }
                setStaticMessages((prev) => [
                    ...prev,
                    ...useCliStore.getState().activeMessages,
                    userMsg,
                    noticeMsg,
                ])
                setActiveMessages([])
                return
            }

            setCurrentPlannedPrompt(originalPrompt)

            const planPrompt = getPlanPrompt(
                originalPrompt || '',
                grillQuestions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }))
            )

            setIsStreaming(true)
            setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
            const assistantMsgId = getNextMsgId()
            setActiveMessages([
                {
                    id: getNextMsgId(),
                    role: 'user',
                    text: `Generate plan from grill interview for: "${originalPrompt}"`,
                },
                { id: assistantMsgId, role: 'assistant', blocks: [] },
            ])
            let planSuccess = false
            try {
                const stream = runAgentLoop(agent, planPrompt)
                await processAgentStream({ stream, setActiveMessages, assistantMsgId })
                planSuccess = true
            } catch (err: any) {
                const cleanError = parseErrorMessage(err)
                setActiveMessages((prev) => [
                    ...prev,
                    { id: getNextMsgId(), role: 'error', text: cleanError },
                ])
            } finally {
                setIsStreaming(false)
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([])
                if (planSuccess) {
                    setAuthMode('plan_approve')
                } else {
                    setAuthMode('none')
                }
            }
        },
        [
            agent,
            isAuthenticated,
            grillPrompt,
            grillQuestions,
            setActiveMessages,
            setAuthMode,
            setCurrentPlannedPrompt,
            setGrillAnswers,
            setGrillPrompt,
            setGrillQuestions,
            setIsStreaming,
            setStaticMessages,
        ]
    )

    const handleGrillSelect = useCallback(
        async (item: any) => {
            if (item.value === 'custom') {
                setCustomInputMode(true)
                return
            }

            const nextAnswers = [...grillAnswers, item.value]
            setGrillAnswers(nextAnswers)

            if (currentGrillIndex + 1 < grillQuestions.length) {
                setCurrentGrillIndex(currentGrillIndex + 1)
            } else {
                await generatePlanFromGrill(nextAnswers)
            }
        },
        [
            grillAnswers,
            currentGrillIndex,
            grillQuestions,
            generatePlanFromGrill,
            setCurrentGrillIndex,
            setCustomInputMode,
            setGrillAnswers,
        ]
    )

    const handleSubmit = useCallback(
        async (text: string) => {
            if (text.trim() === '/exit') {
                setShouldExit(true)
                process.exit(0)
                return
            }

            if (text.trim().startsWith('!')) {
                const rawCmd = text.trim().slice(1).trim()
                if (!rawCmd) {
                    addToast('Usage: !<command> (e.g. !git status)', 'info')
                    return
                }

                const userMsgId = getNextMsgId()
                const assistantMsgId = getNextMsgId()

                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                setActiveMessages([
                    {
                        id: userMsgId,
                        role: 'user',
                        text: `!${rawCmd}`,
                    },
                    {
                        id: assistantMsgId,
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'command',
                                toolName: 'bash',
                                command: rawCmd,
                                status: 'running',
                                output: '',
                            },
                        ],
                    },
                ])

                setIsStreaming(true)

                const { promise, abort } = startDirectCommand(rawCmd, {
                    timeoutMs: 60_000,
                    onData: (chunk) => {
                        setActiveMessages((prev) =>
                            prev.map((msg) => {
                                if (msg.id !== assistantMsgId) return msg
                                const blocks = msg.blocks || []
                                const newBlocks = blocks.map((b) => {
                                    if (b.type === 'command' && b.command === rawCmd) {
                                        return {
                                            ...b,
                                            output: (b.output || '') + chunk,
                                        }
                                    }
                                    return b
                                })
                                return { ...msg, blocks: newBlocks }
                            })
                        )
                    },
                    onBackground: (taskId) => {
                        addToast(
                            `Command running > 60s moved to background (${taskId}). Use /tasks to view logs.`,
                            'info'
                        )
                        setActiveMessages((prev) =>
                            prev.map((msg) => {
                                if (msg.id !== assistantMsgId) return msg
                                const blocks = msg.blocks || []
                                const newBlocks = blocks.map((b) => {
                                    if (b.type === 'command' && b.command === rawCmd) {
                                        return {
                                            ...b,
                                            status: 'success' as const,
                                            output:
                                                (b.output || '') +
                                                `\n[Moved to background task: ${taskId}. Use /tasks to inspect.]`,
                                        }
                                    }
                                    return b
                                })
                                return { ...msg, blocks: newBlocks }
                            })
                        )
                    },
                })

                activeShellAbortRef.current = abort

                try {
                    const result = await promise
                    if (!result.isBackground) {
                        setActiveMessages((prev) =>
                            prev.map((msg) => {
                                if (msg.id !== assistantMsgId) return msg
                                const blocks = msg.blocks || []
                                const newBlocks = blocks.map((b) => {
                                    if (b.type === 'command' && b.command === rawCmd) {
                                        return {
                                            ...b,
                                            status: (result.exitCode === 0
                                                ? 'success'
                                                : 'error') as 'success' | 'error',
                                            output: result.output,
                                        }
                                    }
                                    return b
                                })
                                return { ...msg, blocks: newBlocks }
                            })
                        )

                        // Append to agent.messages so LLM has context for subsequent user turns
                        if (agent && agent.messages) {
                            agent.messages.push({
                                role: 'user',
                                content: `!${rawCmd}`,
                            })
                            agent.messages.push({
                                role: 'assistant',
                                content: `[Direct Shell Output: ${rawCmd}]\n${result.output}`,
                            })
                        }
                    }
                } finally {
                    activeShellAbortRef.current = null
                    setIsStreaming(false)
                    setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                    setActiveMessages([])
                }
                return
            }

            if (text.trim() === '/auth status' || text.trim() === '/auth') {
                const config = await loadConfig()
                const { getAuthStatus } = await import('../config')
                const authStatus = await getAuthStatus()
                const subKeys = config.subscriptions ? Object.keys(config.subscriptions) : []
                const byokKeys = config.providers ? Object.keys(config.providers) : []

                let subLines = ''
                if (subKeys.length > 0) {
                    for (const k of subKeys) {
                        const sub = config.subscriptions![k]
                        const typeStr = sub.subscriptionType ? ` [${sub.subscriptionType}]` : ''
                        const userStr =
                            sub.email || sub.accountName ? ` (${sub.email || sub.accountName})` : ''
                        const expStr = sub.expiresAt
                            ? sub.expiresAt > Date.now()
                                ? 'Valid'
                                : 'Expired (will auto-refresh)'
                            : 'Active'
                        subLines += `\n• **${k.toUpperCase()}**${typeStr}${userStr}: ${expStr}`
                    }
                } else {
                    subLines = '\n*(None detected. Run /auth import or /login <provider>)*'
                }

                let byokLines = ''
                if (byokKeys.length > 0) {
                    for (const k of byokKeys) {
                        byokLines += `\n• **${k.toUpperCase()}**`
                    }
                } else {
                    byokLines = '\n*(None configured)*'
                }

                const decStatus = config.decemberToken
                    ? `Connected ${config.email ? `(${config.email})` : ''}`
                    : 'Not connected'

                const card = `### Authentication & Subscription Status

**Subscriptions:**${subLines}

**BYOK API Keys:**${byokLines}

**December Cloud Wallet:**
${decStatus}

**Active Auth Priority:** \`${config.authPriority || authStatus.authPriority}\`
**Active Provider:** \`${config.activeProvider || 'none'}\` (Model: \`${config.activeModel || 'default'}\`)`

                setActiveMessages((prev) => [
                    ...prev,
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [{ type: 'text', content: card }],
                    },
                ])
                return
            }

            if (text.trim() === '/auth import') {
                addToast('Scanning local directories for subscriptions...', 'info')
                const { importLocalSubscriptions } =
                    await import('../auth/subscriptions/subscription-manager')
                const result = await importLocalSubscriptions()
                if (result.imported.length === 0) {
                    addToast('No local subscription credentials found.', 'info')
                } else {
                    addToast(
                        `Imported ${result.imported.length} subscription(s): ${result.imported.join(', ')}`,
                        'success'
                    )
                    const { getProviderConfig, getAuthStatus } = await import('../config')
                    const providerConfig = await getProviderConfig()
                    const authStatus = await getAuthStatus()

                    if (providerConfig && agent) {
                        const llm = instantiateProvider(
                            providerConfig.provider,
                            providerConfig.apiKey,
                            {
                                authMethod: providerConfig.authMethod,
                                subscription: providerConfig.subscription,
                                headers: providerConfig.headers,
                                baseURL: providerConfig.baseURL,
                            }
                        )
                        agent.setLLM(llm)
                        agent.modelOptions = { ...agent.modelOptions, model: providerConfig.model }
                        setActiveModel(providerConfig.model)
                        setSelectedProvider(providerConfig.provider)
                        setIsAuthenticated(true)
                        setAuthMethod(providerConfig.authMethod)
                        setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                        setSettingsAuthPriority(authStatus.authPriority)
                    }
                }
                return
            }

            if (text.trim().startsWith('/login ')) {
                const targetProvider = text.trim().slice('/login '.length).trim().toLowerCase()
                if (targetProvider) {
                    try {
                        const { loginSubscription } =
                            await import('../auth/subscriptions/subscription-manager')
                        addToast(
                            `Initiating subscription login for ${targetProvider.toUpperCase()}...`,
                            'info'
                        )
                        await loginSubscription(targetProvider)
                        const { getProviderConfig, getAuthStatus } = await import('../config')
                        const providerConfig = await getProviderConfig()
                        const authStatus = await getAuthStatus()

                        if (providerConfig && agent) {
                            const llm = instantiateProvider(
                                providerConfig.provider,
                                providerConfig.apiKey,
                                {
                                    authMethod: providerConfig.authMethod,
                                    subscription: providerConfig.subscription,
                                    headers: providerConfig.headers,
                                    baseURL: providerConfig.baseURL,
                                }
                            )
                            agent.setLLM(llm)
                            agent.modelOptions = {
                                ...agent.modelOptions,
                                model: providerConfig.model,
                            }
                            setActiveModel(providerConfig.model)
                            setSelectedProvider(providerConfig.provider)
                            setIsAuthenticated(true)
                            setAuthMethod(providerConfig.authMethod)
                            setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                            setSettingsAuthPriority(authStatus.authPriority)
                        }
                        addToast(
                            `Successfully authenticated ${targetProvider.toUpperCase()}!`,
                            'success'
                        )
                    } catch (e: any) {
                        addToast(`Login failed: ${e.message}`, 'error')
                    }
                    return
                }
            }

            if (text.trim().startsWith('/logout ')) {
                const targetProvider = text.trim().slice('/logout '.length).trim().toLowerCase()
                if (targetProvider) {
                    const config = await loadConfig()
                    let removed = false
                    if (config.subscriptions && config.subscriptions[targetProvider]) {
                        delete config.subscriptions[targetProvider]
                        removed = true
                    }
                    if (config.providers && config.providers[targetProvider]) {
                        delete config.providers[targetProvider]
                        removed = true
                    }
                    if (targetProvider === 'december' && config.decemberToken) {
                        delete config.decemberToken
                        delete config.email
                        removed = true
                    }
                    if (config.activeProvider === targetProvider) {
                        delete config.activeProvider
                        delete config.activeModel
                    }
                    await saveConfig(config)
                    const { getProviderConfig, getAuthStatus } = await import('../config')
                    const providerConfig = await getProviderConfig()
                    const authStatus = await getAuthStatus()

                    setIsAuthenticated(!!providerConfig)
                    setHasBothAuth(authStatus.hasByok && authStatus.hasDecember)
                    setSettingsAuthPriority(authStatus.authPriority)

                    if (providerConfig && agent) {
                        const llm = instantiateProvider(
                            providerConfig.provider,
                            providerConfig.apiKey,
                            {
                                authMethod: providerConfig.authMethod,
                                subscription: providerConfig.subscription,
                                headers: providerConfig.headers,
                                baseURL: providerConfig.baseURL,
                            }
                        )
                        agent.setLLM(llm)
                        agent.modelOptions = { ...agent.modelOptions, model: providerConfig.model }
                        setActiveModel(providerConfig.model)
                        setSelectedProvider(providerConfig.provider)
                        setAuthMethod(providerConfig.authMethod)
                    } else {
                        setActiveModel('')
                        setSelectedProvider(undefined)
                        setAuthMethod(undefined)
                    }

                    if (removed) {
                        addToast(`Logged out of ${targetProvider}.`, 'success')
                    } else {
                        addToast(`No active credentials found for ${targetProvider}.`, 'info')
                    }
                    return
                }
            }

            if (text.trim() === '/logout') {
                const config = await loadConfig()
                const items: { label: string; value: string }[] = []
                if (config.subscriptions) {
                    for (const sub of Object.keys(config.subscriptions)) {
                        items.push({
                            label: `${sub.charAt(0).toUpperCase() + sub.slice(1)} (Subscription)`,
                            value: `subscription:${sub}`,
                        })
                    }
                }
                if (config.decemberToken) {
                    items.push({ label: 'December (Cloud Wallet)', value: 'decemberToken' })
                }
                if (config.providers) {
                    for (const provider of Object.keys(config.providers)) {
                        items.push({
                            label: `${provider.charAt(0).toUpperCase() + provider.slice(1)} (API Key)`,
                            value: `provider:${provider}`,
                        })
                    }
                }
                if (items.length === 0) {
                    addToast('No stored credentials to remove.', 'info')
                } else {
                    setLogoutItems(items)
                    setAuthMode('logout_select')
                }
                return
            }

            if (text.trim() === '/login') {
                setAuthMode('menu')
                return
            }

            if (text.trim() === '/new') {
                if (agent) {
                    await agent.newContext()
                }
                setStaticMessages([{ id: 'header-' + Date.now(), role: 'header' }])
                setStaticKey((k: number) => k + 1)
                setActiveMessages([])
                setQueuedPrompts([])
                addToast('Started a new conversation.', 'success')
                return
            }

            if (text.trim() === '/clear') {
                if (agent) {
                    await agent.clearContext()
                }
                setStaticMessages([{ id: 'header-' + Date.now(), role: 'header' }])
                setStaticKey((k: number) => k + 1)
                setActiveMessages([])
                setQueuedPrompts([])
                addToast('Cleared conversation history.', 'success')
                return
            }

            if (text.trim() === '/fork') {
                if (agent) {
                    const newId = await agent.forkContext()
                    addToast(`Forked to new session: ${newId}`, 'success')
                } else {
                    addToast('Agent not available to fork session.', 'error')
                }
                return
            }

            if (text.trim() === '/copy') {
                try {
                    const { writeToClipboard } = await import('@december/tui')
                    const assistantMsgs = (agent?.messages || []).filter(
                        (m: any) => m.role === 'assistant'
                    )
                    const lastAgentMsg =
                        assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1] : null

                    let textToCopy = ''
                    if (
                        lastAgentMsg &&
                        typeof lastAgentMsg.content === 'string' &&
                        lastAgentMsg.content.trim()
                    ) {
                        textToCopy = lastAgentMsg.content
                    } else {
                        const allMsgs = [
                            ...useCliStore.getState().staticMessages,
                            ...useCliStore.getState().activeMessages,
                        ]
                        const lastAssistant = [...allMsgs]
                            .reverse()
                            .find((m) => m.role === 'assistant' && m.blocks)
                        if (lastAssistant && lastAssistant.blocks) {
                            textToCopy = lastAssistant.blocks
                                .map((b: any) => b.content || '')
                                .join('\n')
                                .trim()
                        }
                    }

                    if (textToCopy) {
                        writeToClipboard(textToCopy)
                        addToast('Copied last planner response to clipboard!', 'success')
                    } else {
                        addToast('No planner response found to copy.', 'error')
                    }
                } catch {
                    // Intentionally swallowed: clipboard write error fallback
                    addToast('Failed to write to clipboard.', 'error')
                }
                return
            }

            if (text.trim() === '/handoff') {
                const userMsg: Message = { id: getNextMsgId(), role: 'user', text: '/handoff' }
                const config = await loadConfig()

                // Check 1: Is user logged in with December?
                if (!config.decemberToken) {
                    addToast('You must be logged in to December to use handoff.', 'error')
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: HANDOFF_LOGIN_REQUIRED_NOTICE,
                            },
                        ],
                    }
                    setStaticMessages((prev) => [
                        ...prev,
                        ...useCliStore.getState().activeMessages,
                        userMsg,
                        noticeMsg,
                    ])
                    setActiveMessages([])
                    return
                }

                const serverUrl = process.env.SERVER_URL || 'https://api.trydecember.com'
                const proxyUrl = `${serverUrl}/api/v1`

                // Check 2: Does user have credits > 0?
                try {
                    const overviewRes = await fetch(`${proxyUrl}/billing/overview`, {
                        headers: { Authorization: `Bearer ${config.decemberToken}` },
                    })
                    if (overviewRes.ok) {
                        const overviewJson = (await overviewRes.json()) as any
                        const balance = overviewJson.data?.creditBalance ?? 0
                        if (balance <= 0) {
                            addToast('Insufficient credits in December Wallet.', 'error')
                            const noticeMsg: Message = {
                                id: getNextMsgId(),
                                role: 'assistant',
                                blocks: [
                                    {
                                        type: 'text',
                                        content: HANDOFF_INSUFFICIENT_CREDITS_NOTICE,
                                    },
                                ],
                            }
                            setStaticMessages((prev) => [
                                ...prev,
                                ...useCliStore.getState().activeMessages,
                                userMsg,
                                noticeMsg,
                            ])
                            setActiveMessages([])
                            return
                        }
                    }
                } catch {
                    // Intentionally swallowed: fallback handled if billing overview request fails
                }

                const archivePath = '.december-handoff.tar.gz'
                try {
                    addToast('Zipping workspace...', 'info')
                    const { createWorkspaceArchive } = await import('@december/tui')
                    await createWorkspaceArchive(archivePath)

                    addToast('Requesting upload URL...', 'info')
                    const urlRes = await fetch(`${proxyUrl}/cli/handoff/upload-url`, {
                        headers: { Authorization: `Bearer ${config.decemberToken}` },
                    })

                    if (!urlRes.ok) {
                        const fs = await import('node:fs/promises')
                        await fs.unlink(archivePath).catch(() => {})
                        if (urlRes.status === 401) {
                            addToast('You must be logged in to December to use handoff.', 'error')
                            const noticeMsg: Message = {
                                id: getNextMsgId(),
                                role: 'assistant',
                                blocks: [
                                    {
                                        type: 'text',
                                        content: HANDOFF_LOGIN_REQUIRED_NOTICE,
                                    },
                                ],
                            }
                            setStaticMessages((prev) => [
                                ...prev,
                                ...useCliStore.getState().activeMessages,
                                userMsg,
                                noticeMsg,
                            ])
                            setActiveMessages([])
                            return
                        }
                        if (urlRes.status === 402) {
                            addToast('Insufficient credits in December Wallet.', 'error')
                            const noticeMsg: Message = {
                                id: getNextMsgId(),
                                role: 'assistant',
                                blocks: [
                                    {
                                        type: 'text',
                                        content: HANDOFF_INSUFFICIENT_CREDITS_NOTICE,
                                    },
                                ],
                            }
                            setStaticMessages((prev) => [
                                ...prev,
                                ...useCliStore.getState().activeMessages,
                                userMsg,
                                noticeMsg,
                            ])
                            setActiveMessages([])
                            return
                        }
                        const errJson = (await urlRes.json().catch(() => ({}))) as any
                        throw new Error(
                            errJson.message || `Failed to get upload URL (${urlRes.status})`
                        )
                    }

                    const urlJson = (await urlRes.json()) as any
                    const { uploadUrl, objectKey } = urlJson.data || urlJson

                    addToast('Uploading to MinIO...', 'info')
                    const fs = await import('node:fs/promises')
                    const fileData = await fs.readFile(archivePath)
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: fileData,
                    })
                    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`)

                    addToast('Completing handoff...', 'info')
                    const sessionRes = await fetch(`${proxyUrl}/cli/handoff/complete`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${config.decemberToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: 'Handoff from ' + process.cwd().split('/').pop(),
                            messages: agent ? agent.messages : [],
                            objectKey,
                        }),
                    })
                    if (!sessionRes.ok) {
                        const errJson = (await sessionRes.json().catch(() => ({}))) as any
                        throw new Error(errJson.message || (await sessionRes.text()))
                    }
                    const sessionJson = (await sessionRes.json()) as any
                    const sessionId = sessionJson.data?.id || 'session'

                    await fs.unlink(archivePath).catch(() => {})
                    addToast('Handoff complete! Exiting in 3s.', 'success')
                    const successMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: HANDOFF_SUCCESS_NOTICE(sessionId),
                            },
                        ],
                    }
                    setStaticMessages((prev) => [
                        ...prev,
                        ...useCliStore.getState().activeMessages,
                        userMsg,
                        successMsg,
                    ])
                    setActiveMessages([])
                    setTimeout(() => {
                        setShouldExit(true)
                        process.exit(0)
                    }, 3000)
                } catch (e: any) {
                    const fs = await import('node:fs/promises')
                    await fs.unlink(archivePath).catch(() => {})
                    addToast(`Handoff failed: ${e.message}`, 'error')
                }
                return
            }

            if (text.trim() === '/plan' || text.trim().startsWith('/plan ')) {
                const goal = text.trim().slice('/plan'.length).trim()
                if (!goal) {
                    addToast('Usage: /plan <goal description>', 'info')
                    return
                }
                if (!isAuthenticated) {
                    const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: AUTH_REQUIRED_NOTICE,
                            },
                        ],
                    }
                    setStaticMessages((prev) => [
                        ...prev,
                        ...useCliStore.getState().activeMessages,
                        userMsg,
                        noticeMsg,
                    ])
                    setActiveMessages([])
                    return
                }
                setCurrentPlannedPrompt(goal)
                const planPrompt = `You are an autonomous software engineer.\nThe user wants to implement: "${goal}"\n\nPlease create a detailed, step-by-step implementation plan based on these requirements.\nDo NOT execute any tools. Only describe the plan.\nStart your response with '### Implementation Plan' and list the concrete steps.\nExplain which files need to be created, modified, or deleted, and what the changes will be.`

                setIsStreaming(true)
                setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                const assistantMsgId = getNextMsgId()
                setActiveMessages([
                    {
                        id: getNextMsgId(),
                        role: 'user',
                        text: `/plan ${goal}`,
                    },
                    { id: assistantMsgId, role: 'assistant', blocks: [] },
                ])
                let planSuccess = false
                try {
                    const stream = runAgentLoop(agent, planPrompt)
                    await processAgentStream({ stream, setActiveMessages, assistantMsgId })
                    planSuccess = true
                } catch (err: any) {
                    const cleanError = parseErrorMessage(err)
                    setActiveMessages((prev) => [
                        ...prev,
                        { id: getNextMsgId(), role: 'error', text: cleanError },
                    ])
                } finally {
                    setIsStreaming(false)
                    setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                    setActiveMessages([])
                    if (planSuccess) {
                        setAuthMode('plan_approve')
                    }
                }
                return
            }

            if (text.trim() === '/init') {
                const { handleInitCommand } = await import('../commands')
                await handleInitCommand({ quiet: true })
                addToast('Initialized December workspace successfully!', 'success')
                return
            }

            if (text.trim() === '/update') {
                const { performCliUpdate } = await import('../utils/updater')
                const result = await performCliUpdate({
                    onProgress: (msg) => addToast(msg, 'info'),
                    onSuccess: async () => {
                        if (agent) {
                            await agent.saveContext().catch(() => {})
                        }
                    },
                })

                if (result.method === 'source') {
                    addToast(
                        'Running December CLI from local source. Run "git pull && bun install && bun --cwd apps/cli run build" to update.',
                        'info'
                    )
                } else if (result.method === 'npx') {
                    addToast(
                        'Running December CLI via npx/bunx. You are automatically using the latest version.',
                        'info'
                    )
                } else if (result.alreadyUpToDate) {
                    addToast(
                        `You are already using the latest version (v${result.installedVersion || result.targetVersion}).`,
                        'success'
                    )
                } else if (result.success) {
                    const verStr = result.installedVersion ? ` to v${result.installedVersion}` : ''
                    if (result.collisionFixed) {
                        addToast(
                            'Aligned multiple installation paths so your terminal runs the latest version.',
                            'info'
                        )
                    }
                    addToast(
                        `December CLI updated successfully${verStr} via ${result.method}! Restart via "december" to run the latest version.`,
                        'success'
                    )
                    if (result.shellHashNotice) {
                        addToast(
                            'Tip: If your terminal tab still executes an older path, run "hash -r" (bash) or restart your terminal.',
                            'info'
                        )
                    }
                } else {
                    const hintCmd = result.sudoCmd || result.manualCmd
                    addToast(
                        `Update failed (${result.method}): ${result.error || 'Unknown error'}. Try: ${hintCmd}`,
                        'error'
                    )
                }
                return
            }

            if (text.trim() === '/context') {
                setAuthMode('context_select')
                return
            }

            if (text.trim() === '/mcp') {
                setAuthMode('mcp_manager')
                return
            }

            if (text.trim() === '/model') {
                const { getAuthStatus } = await import('../config')
                const status = await getAuthStatus()
                if (
                    !isAuthenticated ||
                    (!status.hasByok && !status.hasDecember && !status.hasSubscription)
                ) {
                    const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: AUTH_REQUIRED_NOTICE,
                            },
                        ],
                    }
                    setStaticMessages((prev) => [
                        ...prev,
                        ...useCliStore.getState().activeMessages,
                        userMsg,
                        noticeMsg,
                    ])
                    setActiveMessages([])
                    return
                }
                loadConfig().then(async (config) => {
                    const { getProviderConfig } = await import('../config')
                    const providerConfig = await getProviderConfig()
                    const activeProvider = config.activeProvider || providerConfig?.provider || ''
                    setSelectedProvider(activeProvider)
                    if (activeProvider === 'ollama') {
                        const { fetchOllamaModels } = await import('../utils/models')
                        const endpoint = config.providers?.['ollama'] || 'http://localhost:11434'
                        fetchOllamaModels(endpoint).then((models) => {
                            setOllamaModels(models)
                        })
                    }
                    setAuthMode('model_select')
                })
                return
            }

            if (text.trim() === '/resume') {
                if (!sessionRepository) {
                    const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [{ type: 'text', content: 'Session repository not available.' }],
                    }
                    setStaticMessages((prev) => [
                        ...prev,
                        ...useCliStore.getState().activeMessages,
                        userMsg,
                        noticeMsg,
                    ])
                    setActiveMessages([])
                    return
                }
                sessionRepository.listSessions().then((sessions: any[]) => {
                    if (sessions.length === 0) {
                        addToast('No previous sessions found.', 'info')
                        return
                    }
                    setSessionsData(sessions)
                    setSessionPage(0)
                    setSessionSelectedIndex(0)
                    setSessionRenameMode(false)
                    setAuthMode('session_select')
                })
                return
            }

            // intercept /grill-me or /grill commands anywhere in the text
            const grillMatch = text.trim().match(/(.*?)(?:\s|^)\/(grill-me|grill)(?:\s(.*))?$/s)
            if (grillMatch) {
                const before = grillMatch[1] || ''
                const after = grillMatch[3] || ''
                const grillPromptText = `${before} ${after}`.trim()

                if (grillPromptText.length > 0) {
                    await generateGrillQuestions(grillPromptText)
                } else {
                    setGrillMode(!grillMode)
                }
                return
            }

            // handle active modes (if the user previously toggled them on)
            if (grillMode) {
                setGrillMode(false)
                await generateGrillQuestions(text.trim())
                return
            }

            if (text.trim() === '/settings') {
                loadConfig().then((config) => {
                    setSettingsNonWorkspace(config.nonWorkspaceAccess ?? false)
                    setSettingsToolPermission(config.toolPermission ?? 'always-proceed')
                    setSettingsThinkingLevel(config.thinkingLevel ?? 'auto')
                    setSettingsSteeringMode(config.steeringMode ?? 'all')
                    setSettingsFollowUpMode(config.followUpMode ?? 'all')
                    setAuthMode('settings_main')
                })
                return
            }

            if (text.trim() === '/tasks') {
                setAuthMode('tasks_mode')
                return
            }

            if (text.trim() === '/usage') {
                const currentModel = agent.modelOptions?.model || 'gemini-3.6-flash'
                const rawProvider = selectedProvider || (agent.llm as any)?.id || ''
                const provider = rawProvider || (authMethod === 'december' ? 'december' : undefined)

                const card = formatUsageCard({
                    model: currentModel,
                    authMethod,
                    provider,
                    isAuthenticated,
                })

                setActiveMessages((prev) => [
                    ...prev,
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: `\n${card}\n`,
                            },
                        ],
                    },
                ])
                return
            }

            if (text.trim() === '/feedback') {
                const url = 'https://github.com/phasehumans/december/issues'
                setActiveMessages((prev) => [
                    ...prev,
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: `\nOpening GitHub issues...\n\nIf it doesn't open automatically, please click here:\n[${url}](${url})\n\n*Have feedback, found a bug, or have a feature request? Let us know on GitHub issues!*`,
                            },
                        ],
                    },
                ])
                import('../utils/open')
                    .then((openUtils) => {
                        openUtils.openUrl(url)
                    })
                    .catch(console.error)
                return
            }

            // Check if input matches a custom slash command from commands.json
            if (text.trim().startsWith('/')) {
                const rawTrimmed = text.trim()
                const [firstToken, ...restArgs] = rawTrimmed.split(/\s+/)
                const potentialCmd = firstToken.slice(1).toLowerCase()
                const customCommands = loadCustomCommands()
                const matchedCmd = customCommands.find((c) => c.name.toLowerCase() === potentialCmd)
                if (matchedCmd) {
                    text = interpolateCommandPrompt(matchedCmd.prompt, restArgs)
                }
            }

            if (!isAuthenticated) {
                const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                const noticeMsg: Message = {
                    id: getNextMsgId(),
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: AUTH_REQUIRED_NOTICE,
                        },
                    ],
                }
                setStaticMessages((prev) => [
                    ...prev,
                    ...useCliStore.getState().activeMessages,
                    userMsg,
                    noticeMsg,
                ])
                setActiveMessages([])
                return
            }

            // normal chat logic
            if (isStreaming) {
                setQueuedPrompts((prev) => [...prev, text.trim()])
                return
            }

            let currentText: string | undefined = text.trim()
            while (currentText) {
                if (currentText.includes('@') && !currentText.includes('<context_file')) {
                    try {
                        const { resolveContextMentions } = await import('@december/shared')
                        const resolved = await resolveContextMentions(currentText)
                        currentText = resolved.expandedPrompt
                    } catch {
                        // Intentionally swallowed: keep currentText on resolution error
                    }
                }

                setIsStreaming(true)
                const assistantMsgId = getNextMsgId()
                const newUserMsg: Message = { id: getNextMsgId(), role: 'user', text: currentText }
                setStaticMessages((prev) => [
                    ...prev,
                    ...useCliStore.getState().activeMessages,
                    newUserMsg,
                ])
                setActiveMessages([{ id: assistantMsgId, role: 'assistant', blocks: [] }])

                try {
                    const stream = runAgentLoop(agent, currentText)
                    await processAgentStream({ stream, setActiveMessages, assistantMsgId })
                } catch (err: any) {
                    setActiveMessages((prev) => [
                        ...prev,
                        { id: getNextMsgId(), role: 'error', text: err.message },
                    ])
                } finally {
                    setIsStreaming(false)
                    setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
                    setActiveMessages([])
                }

                const nextQueue = useCliStore.getState().queuedPrompts
                if (nextQueue.length > 0) {
                    currentText = nextQueue[0]
                    useCliStore.getState().setQueuedPrompts(nextQueue.slice(1))
                } else {
                    currentText = undefined
                }
            }
        },
        [
            agent,
            isAuthenticated,
            isStreaming,
            generateGrillQuestions,
            sessionRepository,
            grillMode,
            setQueuedPrompts,
            addToast,
            setActiveMessages,
            setAuthMode,
            setGrillMode,
            setIsStreaming,
            setLogoutItems,
            setSelectedProvider,
            setSessionPage,
            setSessionRenameMode,
            setSessionSelectedIndex,
            setSessionsData,
            setSettingsFollowUpMode,
            setSettingsNonWorkspace,
            setSettingsSteeringMode,
            setSettingsThinkingLevel,
            setSettingsToolPermission,
            setShouldExit,
            setStaticMessages,
            setStaticKey,
            setOllamaModels,
            setCurrentPlannedPrompt,
            authMethod,
            selectedProvider,
        ]
    )

    const handleAbort = useCallback(() => {
        if (activeShellAbortRef.current) {
            activeShellAbortRef.current()
            activeShellAbortRef.current = null
        }
        if (isStreaming && agent) {
            agent.abort()
            setQueuedPrompts([])
        }
    }, [isStreaming, agent, setQueuedPrompts])

    const {
        handleSettingsMainSelect,
        handleSettingsAgentSelect,
        handleSettingsUISelect,
        handleSettingsKeysSelect,
    } = useSettingsHandlers()

    const {
        handleAuthMenuSelect,
        handleModelSelect,
        handleProviderSelect,
        handleSubscriptionSelect,
        handleKeySubmit,
        handleLogoutSelect,
        handleSessionSelect,
        handleOllamaRetry,
        handleOllamaCancel,
        handleOllamaProceed,
    } = useAuthHandlers(agent, onLogin, onLoginHeadless)

    const handlePlanApprovalSelect = useCallback(
        async (item: any) => {
            setAuthMode('none')
            const originalPrompt = currentPlannedPrompt
            setCurrentPlannedPrompt(null)

            if (item.value === 'approve') {
                if (originalPrompt) {
                    await handleSubmit(originalPrompt)
                }
            } else {
                addToast('Plan rejected.', 'error')
            }
        },
        [currentPlannedPrompt, handleSubmit, addToast, setAuthMode, setCurrentPlannedPrompt]
    )

    const handleContextSelect = () => {}

    const handleToggleMcpServer = async (serverName: string) => {
        try {
            const { toggleMcpServer } = await import('@december/tools')
            const { config, disabled } = await toggleMcpServer({
                name: serverName,
                workspaceDir: process.cwd(),
            })
            if (agent.mcpPool) {
                const { tools } = await agent.mcpPool.reload(config)
                agent.syncMcpTools(tools)
            }
            addToast(`MCP server '${serverName}' ${disabled ? 'disabled' : 'enabled'}`)
            setStaticKey((k: number) => k + 1)
        } catch (err: any) {
            addToast(`Failed to toggle MCP server: ${err.message}`, 'error')
        }
    }

    const handleReloadMcp = async () => {
        try {
            if (agent.mcpPool) {
                const { tools } = await agent.mcpPool.reload()
                agent.syncMcpTools(tools)
                addToast('MCP servers and tools reloaded successfully')
                setStaticKey((k: number) => k + 1)
            } else {
                addToast('MCP pool not initialized', 'error')
            }
        } catch (err: any) {
            addToast(`Failed to reload MCP servers: ${err.message}`, 'error')
        }
    }

    const handleAddMcpServer = async (
        name: string,
        serverConfig: any,
        scope: 'workspace' | 'global' = 'workspace'
    ) => {
        try {
            const { addMcpServer } = await import('@december/tools')
            const config = await addMcpServer({
                name,
                serverConfig,
                scope,
                workspaceDir: process.cwd(),
            })
            if (agent.mcpPool) {
                const { tools } = await agent.mcpPool.reload(config)
                agent.syncMcpTools(tools)
            }
            addToast(`Added MCP server '${name}'`)
            setStaticKey((k: number) => k + 1)
        } catch (err: any) {
            addToast(`Failed to add MCP server: ${err.message}`, 'error')
        }
    }

    const handleRemoveMcpServer = async (
        serverName: string,
        scope: 'workspace' | 'global' = 'workspace'
    ) => {
        try {
            const { removeMcpServer } = await import('@december/tools')
            const config = await removeMcpServer({
                name: serverName,
                scope,
                workspaceDir: process.cwd(),
            })
            if (agent.mcpPool) {
                const { tools } = await agent.mcpPool.reload(config)
                agent.syncMcpTools(tools)
            }
            addToast(`Removed MCP server '${serverName}'`)
            setStaticKey((k: number) => k + 1)
        } catch (err: any) {
            addToast(`Failed to remove MCP server: ${err.message}`, 'error')
        }
    }

    const handleTestMcpServer = async (serverName: string) => {
        try {
            if (agent.mcpPool) {
                const result = await agent.mcpPool.testServer(serverName)
                if (result.success) {
                    addToast(
                        `Server '${serverName}' connected (${result.latencyMs}ms, ${result.toolsCount} tools)`
                    )
                } else {
                    addToast(`Connection failed: ${result.error}`, 'error')
                }
                return result
            }
        } catch (err: any) {
            addToast(`Test connection failed: ${err.message}`, 'error')
            return { success: false, error: err.message }
        }
    }

    return {
        currentPlannedPrompt,
        setCurrentPlannedPrompt,
        grillMode,
        setGrillMode,
        tasksData,
        setTasksData,
        taskSelectedIndex,
        setTaskSelectedIndex,
        taskViewingId,
        setTaskViewingId,
        taskScrollOffset,
        setTaskScrollOffset,
        grillQuestions,
        setGrillQuestions,
        currentGrillIndex,
        setCurrentGrillIndex,
        grillAnswers,
        setGrillAnswers,
        grillPrompt,
        setGrillPrompt,
        customInputMode,
        setCustomInputMode,
        customAnswer,
        setCustomAnswer,
        staticMessages,
        setStaticMessages,
        staticKey,
        setStaticKey,
        activeMessages,
        setActiveMessages,
        isStreaming,
        setIsStreaming,
        isAuthenticated,
        setIsAuthenticated,
        authMethod,
        hasBothAuth,
        settingsAuthPriority,
        currentEmail,
        setCurrentEmail,
        authMode,
        setAuthMode,
        logoutItems,
        setLogoutItems,
        selectedProvider,
        setSelectedProvider,
        apiKey,
        setApiKey,
        authError,
        setAuthError,
        openRouterModels,
        setOpenRouterModels,
        sessionItems,
        setSessionItems,
        sessionsData,
        setSessionsData,
        sessionPage,
        setSessionPage,
        sessionSelectedIndex,
        setSessionSelectedIndex,
        sessionRenameMode,
        setSessionRenameMode,
        sessionNewName,
        setSessionNewName,
        settingsNonWorkspace,
        setSettingsNonWorkspace,
        settingsToolPermission,
        setSettingsToolPermission,
        settingsThinkingLevel,
        setSettingsThinkingLevel,
        settingsSteeringMode,
        setSettingsSteeringMode,
        settingsFollowUpMode,
        setSettingsFollowUpMode,
        handleSubmit,
        sessionRepository,
        handleSettingsMainSelect,
        handleSettingsAgentSelect,
        handleSettingsUISelect,
        handleSettingsKeysSelect,
        handleAuthMenuSelect,
        handleModelSelect,
        handleSessionSelect,
        handlePlanApprovalSelect,
        handleProviderSelect,
        handleSubscriptionSelect,
        handleKeySubmit,
        handleLogoutSelect,
        handleGrillSelect,
        pendingQuestions,
        setPendingQuestions,
        getProviderModels,
        handleAbort,
        handleKillTask,
        toasts,
        addToast,
        expandCommands,
        toggleExpandCommands,
        queuedPrompts,
        setQueuedPrompts,
        ollamaStatus,
        setOllamaStatus,
        ollamaModels,
        setOllamaModels,
        handleOllamaRetry,
        handleOllamaCancel,
        handleOllamaProceed,
        pendingToolCall,
        setPendingToolCall,
        handleToggleMcpServer,
        handleReloadMcp,
        handleAddMcpServer,
        handleRemoveMcpServer,
        handleTestMcpServer,
        activeModel,
        setActiveModel,
        detectedSubscriptions,
    }
}
