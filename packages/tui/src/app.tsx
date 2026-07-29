import { Agent } from '@december/agent'
import { MessageList, InputBar, TaskHUD, GlobalShortcuts } from '@december/tui'
import { AuthMenus, AskQuestionMenu } from '@december/tui'
import { Box } from 'ink'
import { useState, useCallback, useEffect } from 'react'

export function ChatApp({
    agent,
    isAuthenticated: initialAuth,
    cliVersion,
    userEmail,
    sessionRepository,
    onLogin,
    onLoginHeadless,
    session,
}: {
    agent: Agent
    isAuthenticated: boolean
    cliVersion?: string
    userEmail?: string
    sessionRepository?: any
    onLogin?: () => Promise<{ token: string; email: string | null }>
    onLoginHeadless?: (
        onCode: (code: string, uri: string) => void
    ) => Promise<{ token: string; email: string | null }>
    session: any
}) {
    const [inputHistory, setInputHistory] = useState<string[]>([])
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
        planMode,
        grillMode,
        setStaticMessages,
        setStaticKey,
        setActiveMessages,
        setAuthMode,
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
            if (text && !text.startsWith('/')) {
                setInputHistory((prev) => [...prev, text])
            }
            session.handleSubmit(text)
        },
        [session.handleSubmit]
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
            <TaskHUD cwd={process.cwd()} showTasks={session.settingsShowTasks} />
            <MessageList
                staticKey={staticKey}
                staticMessages={staticMessages}
                activeMessages={activeMessages}
                isAuthenticated={isAuthenticated}
                cliVersion={cliVersion}
                userEmail={currentEmail || userEmail}
            />

            <InputBar
                onSubmit={handleFormSubmit}
                history={inputHistory}
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
                                    lastAssistant.blocks?.map((b) => b.content || '').join('\n') ||
                                    ''
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
                resetChat={() => {
                    console.clear()
                    setStaticMessages([{ id: 'header-' + Date.now(), role: 'header' }])
                    setStaticKey((k) => k + 1)
                    setActiveMessages([])
                }}
                planMode={planMode}
                grillMode={grillMode}
                customInputMode={false}
                showExitConfirm={exitConfirm}
            />
        </Box>
    )
}
