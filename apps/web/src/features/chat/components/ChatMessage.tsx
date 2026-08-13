import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import React from 'react'

import type { ChatMessageProps } from '@/features/chat/types'

import { useChatMessageController } from '@/features/chat/hooks/useChatMessageController'
import { renderRichContent } from '@/features/chat/utils/chatFormatting'
import { cn } from '@/shared/lib/utils'

export const ChatMessage: React.FC<ChatMessageProps> = ({
    id,
    role,
    content,
    thoughts,
    plan,
    summary,
    isGenerating,
    executionTime,
    index,
    status = 'done',
    generatedFiles,
    projectType = 'generated',
    appliedFiles,
    tokensUsed,
    creditsUsed,
    modelName,
    onTriggerSimulation,
    onOpenFile,
    projectId,
}) => {
    const {
        feedback,
        setFeedback,
        isThoughtsOpen,
        setIsThoughtsOpen,
        displayedPlan,
        displayedThoughts,
        displayedSummary,
        isStreamFinished,
        isThinkingPhase,
        thinkingText,
        planText,
        shouldForceStream,
    } = useChatMessageController({
        id,
        content,
        thoughts,
        plan,
        summary,
        status,
        index,
        projectType,
        projectId,
    })

    if (role === 'user') {
        return (
            <div className="flex flex-col gap-1 items-end w-full font-sans">
                <div className="bg-[#1B1B1B] px-4.5 py-3 rounded-2xl text-sm leading-relaxed text-[#EDEDED] selection:bg-blue-500/20 shadow-sm w-full break-words whitespace-pre-wrap border-none">
                    {content}
                </div>
            </div>
        )
    }

    const allFilesArray = generatedFiles ? (Object.values(generatedFiles) as any[]) : []
    const filesArray =
        appliedFiles && appliedFiles.length > 0
            ? allFilesArray.filter((f: any) => appliedFiles.includes(f.path))
            : allFilesArray
    const totalFiles = filesArray.length
    const isBuildingPhase = status === 'building'
    const isCompletedPhase = status === 'done'
    const showActions = !isGenerating && isCompletedPhase && isStreamFinished

    // segment calculation
    const showThinking = isThinkingPhase || Boolean(thoughts)

    const showPlan = Boolean(plan)

    const isPlanFinished = !planText || displayedPlan.length >= planText.length
    const showFiles =
        projectType === 'generated' &&
        (isBuildingPhase || isCompletedPhase) &&
        totalFiles > 0 &&
        isPlanFinished

    const showSummary = projectType === 'generated' && Boolean(summary)

    // for normal messages, we don't animate thoughts because sse handles it.
    // but for forcestream messages, we simulate the thoughts streaming too.
    const activeThoughtsText = shouldForceStream ? displayedThoughts : thinkingText

    return (
        <div className="flex flex-col gap-2 animate-in fade-in duration-500 font-sans w-full">
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.06 }}
                className="pl-1 flex flex-col gap-2.5"
            >
                {/* assistant meta */}
                <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide">
                    <span className="text-[#8E8D8C]">December</span>
                    {(isThinkingPhase || isBuildingPhase || status === 'error') && (
                        <span
                            className={
                                isThinkingPhase || isBuildingPhase
                                    ? 'text-[#A1A09F] animate-pulse'
                                    : 'text-red-400'
                            }
                        >
                            {isThinkingPhase
                                ? 'Thinking...'
                                : isBuildingPhase
                                  ? 'Building...'
                                  : 'Error'}
                        </span>
                    )}
                </div>

                {/* 1. thinking phase collapsible block */}
                {showThinking && activeThoughtsText.trim().length > 0 && (
                    <div className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() => setIsThoughtsOpen(!isThoughtsOpen)}
                            className="flex items-center gap-1.5 text-[11px] text-[#8E8D8C] hover:text-[#C4C3C2] transition-colors cursor-pointer select-none"
                        >
                            <ChevronDown
                                size={12}
                                className={cn(
                                    'transition-transform duration-200',
                                    isThoughtsOpen ? 'rotate-0' : '-rotate-90'
                                )}
                            />
                            <span className="font-medium">
                                {isThinkingPhase && !plan ? 'Thinking' : 'Thoughts'}
                            </span>
                        </button>

                        <AnimatePresence initial={false}>
                            {isThoughtsOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex gap-3 pl-0.5">
                                        <div className="w-[1.5px] bg-[#2E2D2C] rounded shrink-0 self-stretch" />
                                        <div className="text-[12.5px] leading-relaxed text-[#8E8D8C] font-sans select-text py-0.5 space-y-2">
                                            {renderRichContent(activeThoughtsText, true)}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* 2. plan of action (normal text, streamed) */}
                {showPlan && displayedPlan.trim().length > 0 && (
                    <div className="space-y-2.5 animate-in fade-in duration-300 w-full">
                        {renderRichContent(displayedPlan)}
                    </div>
                )}

                {/* 3. edited files container */}
                {showFiles && (
                    <div className="mt-2 pl-0.5 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-[#91908F] mb-1.5">
                            <span className="text-[11px] font-medium">
                                {isBuildingPhase
                                    ? `Editing ${totalFiles} files`
                                    : `Edited ${totalFiles} files`}
                            </span>
                        </div>
                        <div className="bg-[#1C1C1C] border border-white/5 rounded-lg overflow-hidden w-full max-w-md divide-y divide-white/5">
                            {filesArray.map((file) => {
                                const isFileBuilding = file.status === 'building'

                                return (
                                    <div
                                        key={file.path}
                                        onClick={() => onOpenFile?.(file.path)}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer'
                                        )}
                                    >
                                        <span className="text-[11px] text-[#D4D4D8] font-mono opacity-80 truncate">
                                            {file.path}
                                        </span>
                                        <div className="shrink-0 ml-2">
                                            {isFileBuilding ? (
                                                <Loader2
                                                    size={12}
                                                    className="text-[#91908F] animate-spin"
                                                />
                                            ) : (
                                                <CheckCircle2
                                                    size={12}
                                                    className="text-emerald-500"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 4. final summary (normal text, streamed) */}
                {showSummary && displayedSummary.trim().length > 0 && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-300 w-full">
                        {renderRichContent(displayedSummary)}
                    </div>
                )}

                {/* 5. sleek white actions footer + restore button */}
                {showActions && (
                    <div className="flex items-center justify-between pt-1.5 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors cursor-pointer',
                                        feedback === 'like'
                                            ? 'text-white'
                                            : 'text-[#91908F] hover:text-white'
                                    )}
                                    title="Helpful"
                                >
                                    <ThumbsUp
                                        size={14}
                                        className={cn(
                                            'transition-colors',
                                            feedback === 'like' && 'fill-white'
                                        )}
                                    />
                                </button>
                                <button
                                    onClick={() =>
                                        setFeedback(feedback === 'dislike' ? null : 'dislike')
                                    }
                                    className={cn(
                                        'p-1.5 rounded-md transition-colors cursor-pointer',
                                        feedback === 'dislike'
                                            ? 'text-white'
                                            : 'text-[#91908F] hover:text-white'
                                    )}
                                    title="Not Helpful"
                                >
                                    <ThumbsDown
                                        size={14}
                                        className={cn(
                                            'transition-colors',
                                            feedback === 'dislike' && 'fill-white'
                                        )}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
