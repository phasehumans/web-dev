import React from 'react'

export const useChatMessageController = ({
    id,
    content,
    thoughts,
    plan,
    summary,
    status,
    index,
    projectType,
    projectId,
}: {
    id: string
    content?: string
    thoughts?: string
    plan?: string
    summary?: string
    status?: string
    index?: number
    projectType?: string
    projectId?: string
}) => {
    const [feedback, setFeedback] = React.useState<'like' | 'dislike' | null>(null)
    const [isThoughtsOpen, setIsThoughtsOpen] = React.useState<boolean>(true)
    const [displayedPlan, setDisplayedPlan] = React.useState('')
    const [displayedThoughts, setDisplayedThoughts] = React.useState('')
    const [displayedSummary, setDisplayedSummary] = React.useState('')
    const hasAutoCollapsedRef = React.useRef(false)

    const isFirstImportView = projectType !== 'generated' && index === 1
    const cacheKey = `december_msg_streamed_${id}`
    const justImported = projectId
        ? sessionStorage.getItem(`december_actively_importing_${projectId}`) === 'true'
        : false
    const shouldForceStream = isFirstImportView && justImported && !sessionStorage.getItem(cacheKey)
    const [isStreamFinished, setIsStreamFinished] = React.useState(!shouldForceStream)

    const isThinkingPhase = status === 'thinking'
    const thinkingText = thoughts || (isThinkingPhase && !thoughts ? content || '' : '')
    const planText = plan || ''
    const summaryText = summary || ''

    const thoughtWords = (thoughts || '').trim() ? (thoughts || '').trim().split(/\s+/).length : 0
    const thoughtTokenCount = Math.max(0, Math.round(thoughtWords * 1.33))
    const displayedContent = content || (summaryText ? displayedSummary : '')

    React.useEffect(() => {
        if (shouldForceStream) return

        if (
            (status === 'building' || status === 'done' || Boolean(plan)) &&
            !hasAutoCollapsedRef.current
        ) {
            setIsThoughtsOpen(false)
            hasAutoCollapsedRef.current = true
        }
        if (status === 'thinking' && !plan) {
            setIsThoughtsOpen(true)
            hasAutoCollapsedRef.current = false
        }
    }, [status, plan, shouldForceStream])

    React.useEffect(() => {
        if (!shouldForceStream) {
            setDisplayedThoughts(thinkingText)
            setDisplayedPlan(planText)
            setDisplayedSummary(summaryText)
            return
        }

        let isCancelled = false

        const runStream = async () => {
            if (projectId) {
                sessionStorage.setItem(`december_import_stream_running_${projectId}`, 'true')
                window.dispatchEvent(
                    new CustomEvent('december-import-stream-start', { detail: { projectId } })
                )
            }

            if (thinkingText) {
                setIsThoughtsOpen(true)
                let currentThoughts = ''
                while (currentThoughts.length < thinkingText.length) {
                    if (isCancelled) return
                    const increment = Math.floor(Math.random() * 2) + 1
                    currentThoughts = thinkingText.slice(0, currentThoughts.length + increment)
                    setDisplayedThoughts(currentThoughts)
                    await new Promise((resolve) => setTimeout(resolve, 30))
                }
            }

            if (isCancelled) return
            setIsThoughtsOpen(false)

            await new Promise((resolve) => setTimeout(resolve, 350))

            if (planText) {
                let currentPlan = ''
                while (currentPlan.length < planText.length) {
                    if (isCancelled) return
                    const increment = Math.floor(Math.random() * 2) + 1
                    currentPlan = planText.slice(0, currentPlan.length + increment)
                    setDisplayedPlan(currentPlan)
                    await new Promise((resolve) => setTimeout(resolve, 20))
                }
            }

            if (projectType === 'generated' && summaryText) {
                let currentSummary = ''
                while (currentSummary.length < summaryText.length) {
                    if (isCancelled) return
                    const increment = Math.floor(Math.random() * 2) + 1
                    currentSummary = summaryText.slice(0, currentSummary.length + increment)
                    setDisplayedSummary(currentSummary)
                    await new Promise((resolve) => setTimeout(resolve, 25))
                }
            }

            if (!isCancelled) {
                setIsStreamFinished(true)
                sessionStorage.setItem(cacheKey, 'true')
                if (projectId) {
                    sessionStorage.removeItem(`december_import_stream_running_${projectId}`)
                    sessionStorage.removeItem(`december_actively_importing_${projectId}`)
                    window.dispatchEvent(
                        new CustomEvent('december-import-stream-end', { detail: { projectId } })
                    )
                }
            }
        }

        runStream()

        return () => {
            isCancelled = true
            if (projectId) {
                sessionStorage.removeItem(`december_import_stream_running_${projectId}`)
                window.dispatchEvent(
                    new CustomEvent('december-import-stream-end', { detail: { projectId } })
                )
            }
        }
    }, [thinkingText, planText, summaryText, shouldForceStream, cacheKey, projectType, projectId])

    return {
        feedback,
        setFeedback,
        isThoughtsOpen,
        setIsThoughtsOpen,
        displayedPlan,
        displayedThoughts,
        displayedSummary,
        displayedContent,
        thoughtTokenCount,
        isStreamFinished,
        isThinkingPhase,
        thinkingText,
        planText,
        shouldForceStream,
    }
}
