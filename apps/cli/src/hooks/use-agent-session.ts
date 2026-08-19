import { Agent, runAgentLoop } from '@december/agent'
import { useEffect, useCallback, useState, useRef } from 'react'

import { loadConfig } from '../config'
import { getGrillPrompt, getPlanPrompt } from '../constants/prompts'
import { useCliStore } from '../store'
import { setupAgentInterceptors } from '../store/interceptors'
import { taskManager } from '../task-manager'
import { startDirectCommand } from '../utils/direct-shell'
import { parseErrorMessage } from '../utils/error-parser'
import { extractJsonArray } from '../utils/json-parser'
import { getProviderModels } from '../utils/models'
import { fetchOpenRouterModels } from '../utils/openrouter-models'
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
    authMethod?: 'byok' | 'december' | 'env'
    hasBothAuth?: boolean
    settingsAuthPriority?: 'byok' | 'december'
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

    const [expandCommands, setExpandCommands] = useState(true)
    const toggleExpandCommands = useCallback(() => {
        setExpandCommands((prev) => !prev)
    }, [])

    useEffect(() => {
        setIsAuthenticated(initialAuth)
        setAuthMethod(initialAuthMethod)
        if (initialHasBothAuth !== undefined) setHasBothAuth(initialHasBothAuth)
        if (initialSettingsAuthPriority !== undefined)
            setSettingsAuthPriority(initialSettingsAuthPriority)
        if (userEmail !== undefined) setCurrentEmail(userEmail)
    }, [
        initialAuth,
        initialAuthMethod,
        initialHasBothAuth,
        initialSettingsAuthPriority,
        userEmail,
        setIsAuthenticated,
        setAuthMethod,
        setHasBothAuth,
        setSettingsAuthPriority,
        setCurrentEmail,
    ])

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
            setIsStreaming(true)
            setStaticMessages((prev) => [...prev, ...useCliStore.getState().activeMessages])
            setActiveMessages([
                {
                    id: getNextMsgId(),
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content: '*Analyzing prompt and generating grill questions...*',
                        },
                    ],
                },
            ])

            try {
                const prompt = getGrillPrompt(userPrompt)

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
                    }
                }

                const questions = extractJsonArray(accumulatedText)
                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error('Invalid questions format returned from model.')
                }

                setGrillQuestions(questions)
                setGrillPrompt(userPrompt)
                setGrillAnswers([])
                setCurrentGrillIndex(0)
                setAuthMode('grill_question')
                setCustomInputMode(false)

                setActiveMessages([])
            } catch (err: any) {
                const cleanError = parseErrorMessage(err)
                addToast(`Grill Failed: ${cleanError}`, 'error')
            } finally {
                setIsStreaming(false)
            }
        },
        [
            agent,
            addToast,
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
            try {
                const stream = runAgentLoop(agent, planPrompt)
                await processAgentStream({ stream, setActiveMessages, assistantMsgId })
            } catch (err: any) {
                setActiveMessages((prev) => [
                    ...prev,
                    { id: getNextMsgId(), role: 'error', text: err.message },
                ])
            } finally {
                setIsStreaming(false)
                setAuthMode('plan_approve')
            }
        },
        [
            agent,
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

            if (text.trim() === '/logout') {
                const config = await loadConfig()
                const items: { label: string; value: string }[] = []
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

            if (text.trim() === '/hooks') {
                setAuthMode('hooks' as any)
                return
            }

            if (text.trim() === '/plan' || text.trim().startsWith('/plan ')) {
                const goal = text.trim().slice('/plan'.length).trim()
                if (!goal) {
                    addToast('Usage: /plan <goal description>', 'info')
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
                try {
                    const stream = runAgentLoop(agent, planPrompt)
                    await processAgentStream({ stream, setActiveMessages, assistantMsgId })
                } catch (err: any) {
                    setActiveMessages((prev) => [
                        ...prev,
                        { id: getNextMsgId(), role: 'error', text: err.message },
                    ])
                } finally {
                    setIsStreaming(false)
                    setAuthMode('plan_approve')
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
                if (!isAuthenticated || (!status.hasByok && !status.hasDecember)) {
                    const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                    const noticeMsg: Message = {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content:
                                    'You are not logged in and have no custom API keys (BYOK) configured.\n\nPlease run `/login` to:\n- Sign in with your December account (Cloud Wallet), or\n- Configure Bring Your Own Key (BYOK) for providers like OpenAI, Anthropic, Gemini, OpenRouter, etc.',
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

            if (!isAuthenticated) {
                const userMsg: Message = { id: getNextMsgId(), role: 'user', text }
                const noticeMsg: Message = {
                    id: getNextMsgId(),
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'text',
                            content:
                                'You are not logged in and have no custom API keys (BYOK) configured.\n\nPlease run `/login` to:\n- Sign in with your December account (Cloud Wallet), or\n- Configure Bring Your Own Key (BYOK) for providers like OpenAI, Anthropic, Gemini, OpenRouter, etc.',
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
            setOllamaModels,
            setCurrentPlannedPrompt,
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
            const { loadMcpConfig, saveMcpConfig } = await import('@december/tools')
            const config = await loadMcpConfig({ workspaceDir: process.cwd() })
            if (config.mcpServers?.[serverName]) {
                config.mcpServers[serverName].disabled = !config.mcpServers[serverName].disabled
                await saveMcpConfig({ config, scope: 'workspace', workspaceDir: process.cwd() })
                if (agent.mcpPool) {
                    await agent.mcpPool.reload(config)
                    for (const tool of agent.mcpPool.getTools()) {
                        agent.registerTool(tool)
                    }
                }
                addToast(
                    `MCP server '${serverName}' ${config.mcpServers[serverName].disabled ? 'disabled' : 'enabled'}`
                )
                setStaticKey((k: number) => k + 1)
            }
        } catch (err: any) {
            addToast(`Failed to toggle MCP server: ${err.message}`, 'error')
        }
    }

    const handleReloadMcp = async () => {
        try {
            if (agent.mcpPool) {
                const { tools } = await agent.mcpPool.reload()
                for (const tool of tools) {
                    agent.registerTool(tool)
                }
                addToast('MCP servers and tools reloaded successfully')
                setStaticKey((k: number) => k + 1)
            } else {
                addToast('MCP pool not initialized', 'error')
            }
        } catch (err: any) {
            addToast(`Failed to reload MCP servers: ${err.message}`, 'error')
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
    }
}
