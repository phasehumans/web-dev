import React from 'react'

import { ChatMessage } from './ChatMessage'
import { ChatPromptInput } from './ChatPromptInput'

import type { ChatSidebarProps } from '@/features/chat/types'

import { cn } from '@/shared/lib/utils'

export const ChatThread: React.FC<ChatSidebarProps> = ({
    messages,
    onPromptSubmit,
    onBack,
    isGenerating,
    executionTime,
    editPrompt,
    setEditPrompt,
    handleApplyEdit,
    isVisualMode,
    setIsVisualMode,
    selectedElement,
    handleClearSelection,
    isApplyingEdit,
    isCollapsed,
    onClose,
    mode = 'sidebar',
    projectName,
    generatedFiles,
    projectType,
    onTriggerSimulation,
    isAuthenticated,
    onOpenAuth,
    onOpenFile,
    projectId,
    customWidth,
    isDragging,
    isPreviewCollapsed,
    onTogglePreview,
    activeVersionId,
    sessionTag,
}) => {
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true)
    const prevMessagesLengthRef = React.useRef(messages.length)
    const [isMounted, setIsMounted] = React.useState(false)

    const versionTag = sessionTag || (activeVersionId ? `#${activeVersionId.slice(0, 4)}` : null)

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true)
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    React.useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            setShouldAutoScroll(true)
        }
        prevMessagesLengthRef.current = messages.length
    }, [messages.length])

    const handleScroll = () => {
        const container = scrollContainerRef.current
        if (!container) return

        const threshold = 150
        const isAtBottom =
            Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) <=
            threshold

        if (!isAtBottom) {
            setShouldAutoScroll(false)
        } else {
            setShouldAutoScroll(true)
        }
    }

    React.useEffect(() => {
        const container = scrollContainerRef.current
        const content = contentRef.current

        if (!container || !content) return

        const observer = new ResizeObserver(() => {
            if (shouldAutoScroll) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'auto',
                })
            }
        })

        observer.observe(content)
        return () => observer.disconnect()
    }, [shouldAutoScroll])

    React.useEffect(() => {
        const container = scrollContainerRef.current

        if (!container || !shouldAutoScroll) {
            return
        }

        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'auto',
        })
    }, [messages, generatedFiles, isGenerating, shouldAutoScroll])

    const handleSubmit = () => {
        const nextPrompt = editPrompt.trim()

        if (!nextPrompt) {
            return
        }

        if (selectedElement || isVisualMode) {
            handleApplyEdit()
            return
        }

        onPromptSubmit(nextPrompt)
        setEditPrompt('')
    }

    const messagesList = (
        <div className="flex flex-col gap-8" ref={contentRef}>
            {messages.map((msg, index) => {
                const isLast = index === messages.length - 1
                return (
                    <ChatMessage
                        key={msg.id}
                        id={msg.id}
                        role={msg.role === 'system' ? 'assistant' : msg.role}
                        content={msg.content}
                        blocks={msg.blocks}
                        thoughts={msg.thoughts}
                        plan={msg.plan}
                        summary={msg.summary}
                        isGenerating={isGenerating}
                        executionTime={executionTime}
                        index={index}
                        status={msg.status}
                        statusMessage={msg.statusMessage}
                        generatedFiles={isLast ? generatedFiles : undefined}
                        appliedFiles={msg.appliedFiles}
                        projectType={projectType}
                        tokensUsed={msg.tokensUsed}
                        creditsUsed={msg.creditsUsed}
                        modelName={msg.modelName}
                        onTriggerSimulation={onTriggerSimulation}
                        onOpenFile={onOpenFile}
                        projectId={projectId}
                    />
                )
            })}
        </div>
    )

    const promptInput = (
        <ChatPromptInput
            value={editPrompt}
            onChange={setEditPrompt}
            onSubmit={handleSubmit}
            isVisualMode={isVisualMode}
            onToggleVisualMode={() => setIsVisualMode(!isVisualMode)}
            selectedElement={selectedElement}
            onClearSelection={handleClearSelection}
            isApplyingEdit={isApplyingEdit}
            isAuthenticated={isAuthenticated}
            onOpenAuth={onOpenAuth}
        />
    )

    if (mode === 'mobile') {
        return (
            <div className="h-full bg-[#141414] flex flex-col overflow-hidden font-sans min-h-0">
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-4 chat-scrollbar"
                >
                    {messagesList}
                </div>

                <div className="shrink-0 bg-[#141414] pt-2 px-2.5 pb-2.5">{promptInput}</div>
            </div>
        )
    }

    return (
        <aside
            className={cn(
                'h-full bg-[#141414] flex flex-col overflow-hidden shrink-0 z-20 font-sans border-r-0',
                isMounted && !isDragging && 'transition-[width] duration-200 ease-out',
                isCollapsed
                    ? 'w-0 border-r-0'
                    : isPreviewCollapsed
                      ? 'flex-1 w-full border-r-0'
                      : 'w-full absolute md:relative inset-0 md:inset-auto'
            )}
            style={
                !isCollapsed && !isPreviewCollapsed && customWidth
                    ? { width: `${customWidth}px`, maxWidth: '45%' }
                    : !isCollapsed && !isPreviewCollapsed
                      ? { width: '35%', maxWidth: '45%' }
                      : undefined
            }
        >
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 chat-scrollbar"
                >
                    <div
                        className={cn(
                            'w-full space-y-4',
                            isPreviewCollapsed && 'max-w-xl mx-auto px-2 md:px-0'
                        )}
                    >
                        {messagesList}
                    </div>
                </div>

                <div className="shrink-0 bg-[#141414] pt-3 pl-2.5 pr-2.5 pb-2.5">
                    <div className={cn('w-full', isPreviewCollapsed && 'max-w-xl mx-auto')}>
                        {promptInput}
                    </div>
                </div>
            </div>
        </aside>
    )
}
