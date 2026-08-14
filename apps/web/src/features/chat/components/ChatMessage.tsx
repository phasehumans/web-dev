import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import React from 'react'

import type { ChatMessageProps } from '@/features/chat/types'

import { FileChangeBadge } from '@/features/chat/components/FileChangeBadge'
import { ToolCallCard } from '@/features/chat/components/ToolCallCard'
import { useChatMessageController } from '@/features/chat/hooks/useChatMessageController'
import { renderRichContent } from '@/features/chat/utils/chatFormatting'
import { parseInlineThoughtBlocks } from '@/features/chat/utils/thoughtParser'
import { cn } from '@/shared/lib/utils'

const CollapsibleThoughtView: React.FC<{
    content: string
    tokenCount?: number
    isStreaming?: boolean
    forceExpanded?: boolean
}> = ({ content, tokenCount, isStreaming, forceExpanded }) => {
    const [userExpanded, setUserExpanded] = React.useState<boolean | null>(null)
    const expanded = userExpanded !== null ? userExpanded : (forceExpanded ?? true)

    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const calculatedTokens = tokenCount ?? Math.max(1, Math.round(words * 1.33))

    if (isStreaming) {
        return (
            <div className="py-1 text-xs text-[#8E8D8C] font-mono leading-relaxed select-text animate-pulse">
                {content}
            </div>
        )
    }

    return (
        <div className="space-y-1 my-1 font-sans">
            <button
                type="button"
                onClick={() => setUserExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] text-[#8E8D8C] hover:text-[#C4C3C2] transition-colors cursor-pointer select-none italic"
            >
                <ChevronDown
                    size={12}
                    className={cn(
                        'transition-transform duration-200 not-italic',
                        expanded ? 'rotate-0' : '-rotate-90'
                    )}
                />
                <span>
                    Thoughts ({calculatedTokens} tokens ·{' '}
                    {expanded ? 'ctrl+o to collapse' : 'ctrl+o to expand'})
                </span>
            </button>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-3 pl-1">
                            <div className="w-[1.5px] bg-[#2E2D2C] rounded shrink-0 self-stretch" />
                            <div className="text-[12px] leading-relaxed text-[#8E8D8C] font-sans select-text py-0.5 space-y-2">
                                {renderRichContent(content, true)}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
    id,
    role,
    content,
    blocks,
    thoughts,
    plan,
    summary,
    isGenerating,
    executionTime,
    index,
    status = 'done',
    statusMessage,
    generatedFiles,
    projectType = 'generated',
    appliedFiles,
    tokensUsed,
    creditsUsed,
    modelName,
    expandCommands,
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
        displayedContent,
        thoughtTokenCount,
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
            <div className="flex flex-row items-start gap-2.5 w-full font-sans pl-1 py-1">
                <span className="text-[#89B4F8] font-bold select-none shrink-0 text-[15px] leading-snug">
                    ❭
                </span>
                <div className="text-[14px] leading-relaxed text-[#EDEDED] font-normal selection:bg-blue-500/20 w-full break-words whitespace-pre-wrap">
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

    // segment calculation for fallback
    const showThinking = isThinkingPhase || Boolean(thoughts)
    const showPlan = Boolean(plan)
    const isPlanFinished = !planText || displayedPlan.length >= planText.length
    const showFiles =
        projectType === 'generated' &&
        (isBuildingPhase || isCompletedPhase) &&
        totalFiles > 0 &&
        isPlanFinished

    const activeThoughtsText = shouldForceStream ? displayedThoughts : thinkingText
    const hasBlocks = blocks && blocks.length > 0

    return (
        <div className="flex flex-col gap-2 animate-in fade-in duration-500 font-sans w-full">
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.06 }}
                className="pl-1 flex flex-col gap-2"
            >
                {/* assistant meta header */}
                <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide">
                    <span className="text-[#8E8D8C]">December</span>
                    {(isThinkingPhase ||
                        isBuildingPhase ||
                        status === 'error' ||
                        statusMessage) && (
                        <span
                            className={
                                status === 'error' ? 'text-red-400' : 'text-[#A1A09F] animate-pulse'
                            }
                        >
                            {statusMessage ||
                                (isThinkingPhase
                                    ? 'Thinking...'
                                    : isBuildingPhase
                                      ? 'Building...'
                                      : 'Error')}
                        </span>
                    )}
                </div>

                {/* Structured Multi-Block Execution View */}
                {hasBlocks ? (
                    <div className="flex flex-col gap-1 w-full">
                        {blocks.map((block, bIdx) => {
                            if (block.type === 'thinking') {
                                return (
                                    <CollapsibleThoughtView
                                        key={bIdx}
                                        content={block.content}
                                        isStreaming={block.isStreaming}
                                        forceExpanded={expandCommands}
                                    />
                                )
                            }

                            if (block.type === 'compaction') {
                                return (
                                    <div
                                        key={bIdx}
                                        className="my-1.5 py-1 text-xs text-[#fef08a] italic font-sans flex flex-col gap-0.5"
                                    >
                                        <span className="font-semibold">Context Compacted</span>
                                        {block.summary && (
                                            <span className="text-[#8E8D8C] not-italic">
                                                {block.summary}
                                            </span>
                                        )}
                                    </div>
                                )
                            }

                            if (block.type === 'interrupt') {
                                return (
                                    <div
                                        key={bIdx}
                                        className="my-1.5 py-1 text-xs text-[#8E8D8C] italic font-sans"
                                    >
                                        Interrupted · What should December do instead?
                                    </div>
                                )
                            }

                            if (block.type === 'command') {
                                return (
                                    <ToolCallCard
                                        key={block.toolCallId || bIdx}
                                        toolCallId={block.toolCallId}
                                        toolName={block.toolName}
                                        toolInput={block.toolInput}
                                        status={block.status}
                                        output={block.output}
                                        expandCommands={expandCommands}
                                    />
                                )
                            }

                            if (block.type === 'file_change') {
                                return (
                                    <FileChangeBadge
                                        key={`${block.filePath}-${bIdx}`}
                                        filePath={block.filePath}
                                        action={block.action}
                                        diff={block.diff}
                                        onOpenFile={onOpenFile}
                                    />
                                )
                            }

                            if (block.type === 'text') {
                                const segments = parseInlineThoughtBlocks(
                                    block.content,
                                    isGenerating && bIdx === blocks.length - 1
                                )

                                return (
                                    <div
                                        key={bIdx}
                                        className={cn(
                                            'space-y-2 pt-0.5 animate-in fade-in duration-300 w-full select-text',
                                            block.color && 'text-[#FCA5A5]'
                                        )}
                                    >
                                        {segments.map((seg, sIdx) => {
                                            if (seg.type === 'thought') {
                                                return (
                                                    <CollapsibleThoughtView
                                                        key={sIdx}
                                                        content={seg.content}
                                                        tokenCount={seg.tokenCount}
                                                        isStreaming={seg.isStreaming}
                                                        forceExpanded={expandCommands}
                                                    />
                                                )
                                            }
                                            return (
                                                <React.Fragment key={sIdx}>
                                                    {renderRichContent(seg.content)}
                                                </React.Fragment>
                                            )
                                        })}
                                    </div>
                                )
                            }

                            if (block.type === 'error') {
                                return (
                                    <div
                                        key={bIdx}
                                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans select-text"
                                    >
                                        {block.error}
                                    </div>
                                )
                            }

                            return null
                        })}
                    </div>
                ) : (
                    <>
                        {/* Fallback Unstructured Block View */}
                        {showThinking && activeThoughtsText.trim().length > 0 && (
                            <CollapsibleThoughtView
                                content={activeThoughtsText}
                                forceExpanded={expandCommands}
                            />
                        )}

                        {/* 2. plan of action (normal text, streamed) */}
                        {showPlan && displayedPlan.trim().length > 0 && (
                            <div className="space-y-2 animate-in fade-in duration-300 w-full">
                                {renderRichContent(displayedPlan)}
                            </div>
                        )}

                        {/* 3. edited files container */}
                        {showFiles && (
                            <div className="mt-1 pl-0.5 animate-in fade-in duration-300">
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

                        {/* 4. main text / summary content (streamed response) */}
                        {displayedContent.trim().length > 0 && (
                            <div className="space-y-2 pt-0.5 animate-in fade-in duration-300 w-full select-text">
                                {renderRichContent(displayedContent)}
                            </div>
                        )}
                    </>
                )}

                {/* Actions footer */}
                {showActions && (
                    <div className="flex items-center justify-between pt-1 mt-0.5">
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
