import { Agent, runAgentLoop } from '@december/agent'
import { useEffect, useCallback, useState } from 'react'

import { loadConfig } from '../config'
import { getGrillPrompt, getPlanPrompt } from '../constants/prompts'
import { useCliStore } from '../store'
import { taskManager } from '../task-manager'
import { parseErrorMessage } from '../utils/error-parser'
import { getProviderModels } from '../utils/models'

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
        settingsShowTasks,
        setSettingsShowTasks,
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
            if (!agent.operations) agent.operations = {} as any
            if (!agent.operations.ui) agent.operations.ui = {} as any
            agent.operations.ui!.askQuestion = (questions) => {
                return new Promise((resolve) => {
                    setAuthMode('ask_question')
                    setPendingQuestions({ questions, resolve })
                })
            }

            agent.operations.ui!.requestPermission = async (toolCall: any) => {
                if (
                    ['replace_file_content', 'multi_replace_file_content', 'run_command'].includes(
                        toolCall.name
                    )
                ) {
                    const answer = await new Promise<string>((resolve) => {
                        setAuthMode('ask_question')
                        setPendingQuestions({
                            questions: [
                                {
                                    question: `Execute ${toolCall.name}? (Diff is previewed in chat)`,
                                    options: ['Yes (Approve)', 'No (Deny)'],
                                },
                            ],
                            resolve,
                        })
                    })
                    if (answer !== 'Yes (Approve)') {
                        return { block: true, reason: 'User denied execution in UI.' }
                    }
                }
                return { block: false }
            }
        }
    }, [agent])

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
            setStaticMessages((prev) => [...prev, ...activeMessages])
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

                let cleanJson = accumulatedText.trim()
                if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '')
                }
                cleanJson = cleanJson.trim()

                const questions = JSON.parse(cleanJson)
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
        [agent, activeMessages]
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
            setStaticMessages((prev) => [...prev, ...activeMessages])
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
        [agent, grillPrompt, grillQuestions, activeMessages]
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
        [grillAnswers, currentGrillIndex, grillQuestions, generatePlanFromGrill]
    )

    const handleSubmit = useCallback(
        async (text: string) => {
            if (text.trim() === '/exit') {
                setShouldExit(true)
                process.exit(0)
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

            if (text.trim() === '/hooks') {
                setAuthMode('hooks' as any)
                return
            }

            if (text.trim() === '/context') {
                setAuthMode('context_select')
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
                    setStaticMessages((prev) => [...prev, ...activeMessages, userMsg, noticeMsg])
                    setActiveMessages([])
                    return
                }
                loadConfig().then(async (config) => {
                    const { getProviderConfig } = await import('../config')
                    const providerConfig = await getProviderConfig()
                    const activeProvider = config.activeProvider || providerConfig?.provider || ''
                    setSelectedProvider(activeProvider)
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
                    setStaticMessages((prev) => [...prev, ...activeMessages, userMsg, noticeMsg])
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
                    setSettingsShowTasks(config.showActiveTasks ?? true)
                    setSettingsToolPermission(config.toolPermission ?? 'always-proceed')
                    setSettingsThinkingLevel(config.thinkingLevel ?? 'medium')
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
                const baseUrl = process.env.WEB_URL || 'https://trydecember.com'
                const url = `${baseUrl}/settings/analytics`
                setActiveMessages((prev) => [
                    ...prev,
                    {
                        id: getNextMsgId(),
                        role: 'assistant',
                        blocks: [
                            {
                                type: 'text',
                                content: `Opening usage dashboard...\n\nIf it doesn't open automatically, please click here:\n[${url}](${url})`,
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
                setStaticMessages((prev) => [...prev, ...activeMessages, userMsg, noticeMsg])
                setActiveMessages([])
                return
            }

            // normal chat logic
            if (isStreaming) {
                agent.steer({ role: 'user', content: text, isUI: true })
                setActiveMessages((prev) => [...prev, { id: getNextMsgId(), role: 'user', text }])
                return
            }

            setIsStreaming(true)
            const assistantMsgId = getNextMsgId()
            const newUserMsg: Message = { id: getNextMsgId(), role: 'user', text }
            setStaticMessages((prev) => [...prev, ...activeMessages, newUserMsg])
            setActiveMessages([{ id: assistantMsgId, role: 'assistant', blocks: [] }])

            const promptToSend = text

            try {
                const stream = runAgentLoop(agent, promptToSend)
                await processAgentStream({ stream, setActiveMessages, assistantMsgId })
            } catch (err: any) {
                setActiveMessages((prev) => [
                    ...prev,
                    { id: getNextMsgId(), role: 'error', text: err.message },
                ])
            } finally {
                setIsStreaming(false)
                setStaticMessages((prev) => [...prev, ...activeMessages])
                setActiveMessages([])
            }
        },
        [
            agent,
            activeMessages,
            isAuthenticated,
            isStreaming,
            grillQuestions,
            grillAnswers,
            customInputMode,
            generatePlanFromGrill,
            generateGrillQuestions,
            sessionRepository,
            authMode,
            currentGrillIndex,
            grillMode,
        ]
    )

    const handleAbort = useCallback(() => {
        if (isStreaming && agent) {
            agent.abort()
        }
    }, [isStreaming, agent])

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
        [currentPlannedPrompt, handleSubmit, addToast, setAuthMode]
    )

    const handleContextSelect = () => {}

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
        settingsShowTasks,
        setSettingsShowTasks,
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
    }
}
