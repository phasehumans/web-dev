import { useInput, useApp } from 'ink'

import { useToast } from '../providers/toast'

export function GlobalShortcuts(session: any) {
    const { exit } = useApp()
    const toast = useToast()

    const {
        authMode,
        setAuthMode,
        taskViewingId,
        setTaskViewingId,
        taskScrollOffset,
        setTaskScrollOffset,
        taskSelectedIndex,
        setTaskSelectedIndex,
        sessionRenameMode,
        setSessionRenameMode,
        customInputMode,
        setCustomInputMode,
        grillMode,
        setGrillMode,
        setGrillQuestions,
        setCurrentGrillIndex,
        setGrillAnswers,
        setGrillPrompt,
        setCurrentPlannedPrompt,
        tasksData,
        handleKillTask,
    } = session

    useInput((input, key) => {
        if (authMode === 'tasks_mode') {
            if (key.escape) {
                if (taskViewingId) {
                    setTaskViewingId(null)
                    setTaskScrollOffset(0)
                } else {
                    setAuthMode('none')
                }
            } else if (taskViewingId) {
                if (key.upArrow) setTaskScrollOffset((prev: number) => Math.max(0, prev - 1))
                if (key.downArrow) setTaskScrollOffset((prev: number) => prev + 1)
                if (key.leftArrow) setTaskScrollOffset((prev: number) => Math.max(0, prev - 10))
                if (key.rightArrow) setTaskScrollOffset((prev: number) => prev + 10)
            } else {
                if (key.upArrow) setTaskSelectedIndex((prev: number) => Math.max(0, prev - 1))
                if (key.downArrow)
                    setTaskSelectedIndex((prev: number) =>
                        Math.min(Math.max(0, (tasksData?.length || 1) - 1), prev + 1)
                    )
                if (key.return) {
                    const selected = tasksData?.[taskSelectedIndex]
                    if (selected) {
                        setTaskViewingId(selected.id)
                        setTaskScrollOffset(0)
                    }
                }
                if (input === 'k' || input === 'K') {
                    const selected = tasksData?.[taskSelectedIndex]
                    if (selected && handleKillTask) {
                        handleKillTask(selected.id)
                    }
                }
            }
            return
        }

        if (sessionRenameMode) {
            if (key.escape) setSessionRenameMode(false)
            return
        }

        if (customInputMode) {
            if (key.escape) setCustomInputMode(false)
            return
        }

        if (grillMode) {
            if (key.escape) {
                setGrillMode(false)
                setGrillQuestions([])
                setCurrentGrillIndex(0)
                setGrillAnswers([])
                setGrillPrompt(null)
            }
            return
        }

        if (authMode === 'session_select') {
            return
        }

        if (authMode !== 'none') {
            if (key.escape && authMode !== 'login') {
                if (session.isStreaming) {
                    return
                }
                if (authMode === 'grill_question') {
                    setGrillQuestions([])
                    setCurrentGrillIndex(0)
                    setGrillAnswers([])
                    setGrillPrompt(null)
                    setCustomInputMode(false)
                    setGrillMode(false)
                } else if (authMode === 'byok_key') {
                    if (session.setAuthError) {
                        session.setAuthError(null)
                    }
                    if (session.setApiKey) {
                        session.setApiKey('')
                    }
                }
                setAuthMode('none')
            }
            return
        }

        if (session.isStreaming && key.escape) {
            session.handleAbort()
            return
        }

        if (key.ctrl && input === 'l') {
            setAuthMode('login')
        } else if (key.ctrl && input === 'h') {
            setAuthMode('sessions')
        } else if (key.ctrl && input === 't') {
            setAuthMode('tasks_mode')
        } else if (
            (key.ctrl && ((key as any).name === 'o' || input?.toLowerCase() === 'o')) ||
            input === '\x0f'
        ) {
            if (session.toggleExpandCommands) {
                session.toggleExpandCommands()
            }
        }
    })

    return null
}
