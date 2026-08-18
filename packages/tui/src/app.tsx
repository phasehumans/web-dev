import { Agent } from '@december/agent'
import { Box } from 'ink'
import { useState, useCallback, useEffect } from 'react'

import { GlobalShortcuts } from './components/global-shortcuts'
import { InputBar } from './components/input-bar'
import { AskQuestionMenu } from './components/menus/ask-question-menu'
import { AuthMenus } from './components/menus/auth-menus'
import { ToolPermissionMenu } from './components/menus/tool-permission-menu'
import { MessageList } from './components/message-list'

export function ChatApp({
    agent,
    isAuthenticated: initialAuth,
    cliVersion,
    latestVersion,
    userEmail,
    sessionRepository,
    onLogin,
    onUpdateSuccess,
    session,
}: {
    agent: Agent
    isAuthenticated: boolean
    cliVersion?: string
    latestVersion?: string
    userEmail?: string
    sessionRepository?: any
    onLogin?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>
    onUpdateSuccess?: () => Promise<void>
    session: any
}) {
    const [exitConfirm, setExitConfirm] = useState(false)

    useEffect(() => {
        if (exitConfirm) {
            const timer = setTimeout(() => setExitConfirm(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [exitConfirm])

    const {
        staticKey,
        staticMessages,
        activeMessages,
        isAuthenticated,
        currentEmail,
        authMode,
        grillMode,
        setStaticMessages,
        setStaticKey,
        setActiveMessages,
        setAuthMode,
        handleSubmit,
    } = session
    const authUI =
        authMode !== 'none' ? (
            authMode === 'ask_question' && session.pendingQuestions ? (
                <AskQuestionMenu
                    questions={session.pendingQuestions.questions}
                    onComplete={(answers) => {
                        session.pendingQuestions?.resolve(
                            typeof answers === 'string' ? answers : answers.join(', ')
                        )
                        setAuthMode('none')
                        session.setPendingQuestions(null)
                    }}
                />
            ) : authMode === 'tool_permission' && session.pendingToolCall ? (
                <ToolPermissionMenu
                    toolCall={session.pendingToolCall.toolCall}
                    onComplete={(result) => {
                        session.pendingToolCall?.resolve(result)
                        setAuthMode('none')
                        session.setPendingToolCall(null)
                    }}
                />
            ) : (
                <AuthMenus
                    {...session}
                    agent={agent}
                    getProviderModels={session.getProviderModels}
                />
            )
        ) : null

    const handleFormSubmit = useCallback(
        (text: string) => {
            handleSubmit(text)
        },
        [handleSubmit]
    )

    const totalTokens = [...staticMessages, ...activeMessages].reduce((acc, msg) => {
        if (msg.usage) {
            return acc + (msg.usage.promptTokens || 0) + (msg.usage.completionTokens || 0)
        }
        return acc
    }, 0)

    return (
        <Box flexDirection="column" width="100%">
            <GlobalShortcuts {...session} agent={agent} />
            <MessageList
                staticKey={staticKey}
                staticMessages={staticMessages}
                activeMessages={activeMessages}
                isAuthenticated={isAuthenticated}
                cliVersion={cliVersion}
                latestVersion={latestVersion}
                userEmail={currentEmail || userEmail}
                expandCommands={session.expandCommands}
            />

            <InputBar
                onSubmit={handleFormSubmit}
                disabled={authMode !== 'none'}
                onInterrupt={() => {
                    if (session.isStreaming) {
                        agent.abort()
                    } else {
                        if (exitConfirm) {
                            process.exit(0)
                        } else {
                            setExitConfirm(true)
                        }
                    }
                }}
                onCopy={() => {
                    import('./utils/clipboard')
                        .then((cb) => {
                            const allMsgs = [...staticMessages, ...activeMessages]
                            const lastAssistant = [...allMsgs]
                                .reverse()
                                .find((m) => m.role === 'assistant' && m.blocks)
                            if (lastAssistant) {
                                const text =
                                    lastAssistant.blocks
                                        ?.map((b: any) => b.content || '')
                                        .join('\n') || ''
                                cb.writeToClipboard(text)
                            }
                        })
                        .catch(console.error)
                }}
                placeholder="Ask December to build..."
                activeModel={agent.modelOptions?.model || 'gemini-3.6-flash'}
                contextTokens={totalTokens}
                authMethod={session.authMethod}
                hasBothAuth={session.hasBothAuth}
                authUI={authUI}
                agent={agent}
                toasts={session.toasts}
                resetChat={() => {
                    console.clear()
                    setStaticMessages([{ id: 'header-' + Date.now(), role: 'header' }])
                    setStaticKey((k: number) => k + 1)
                    setActiveMessages([])
                    session.setQueuedPrompts?.([])
                    session.addToast?.('Started a new conversation.', 'success')
                }}
                onUpdateSuccess={onUpdateSuccess}
                queuedPrompts={session.queuedPrompts}
                grillMode={grillMode}
                customInputMode={false}
                showExitConfirm={exitConfirm}
            />
        </Box>
    )
}
