import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import React from 'react'

import { CliSpinner } from './CliSpinner'
import { ToolCallCard } from './ToolCallCard'

import type { ChatMessageProps } from '@/features/chat/types'

import { useChatMessageController } from '@/features/chat/hooks/useChatMessageController'
import { renderRichContent } from '@/features/chat/utils/chatFormatting'
import { parseInlineThoughtBlocks } from '@/features/chat/utils/thoughtParser'
import { getToolActionLabel } from '@/features/chat/utils/toolFormatter'
import { cn } from '@/shared/lib/utils'

const CollapsibleThoughtView: React.FC<{
    content: string
    tokenCount?: number
    isStreaming?: boolean
    forceExpanded?: boolean
}> = ({ content, isStreaming }) => {
    const [expanded, setExpanded] = React.useState(false)

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
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11.5px] text-[#8E8D8C] hover:text-[#C4C3C2] transition-colors cursor-pointer select-none italic"
            >
                <ChevronDown
                    size={12}
                    className={cn(
                        'transition-transform duration-200 not-italic',
                        expanded ? 'rotate-0' : '-rotate-90'
                    )}
                />
                <span>Thoughts</span>
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
                        <div className="text-[12.5px] leading-relaxed text-[#8E8D8C] font-sans select-text py-0.5 space-y-2 pl-4">
                            {renderRichContent(content, true)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({
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
    onTriggerSimulation,
    onOpenFile,
    projectId,
}) => {
    const {
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

    const isBuildingPhase = status === 'building'
    const isCompletedPhase = status === 'done'
    const runningBlock = blocks?.find((b) => b.type === 'command' && b.status === 'running')
    const runningToolName = runningBlock?.type === 'command' ? runningBlock.toolName : undefined

    const currentStatusLabel = React.useMemo(() => {
        if (statusMessage) return statusMessage
        if (runningToolName) return getToolActionLabel(runningToolName)
        if (isThinkingPhase) return 'Thinking...'
        if (isBuildingPhase) return 'Working...'
        return null
    }, [statusMessage, runningToolName, isThinkingPhase, isBuildingPhase])

    if (role === 'user') {
        return (
            <div className="flex flex-col gap-1 items-end w-full font-sans">
                <div className="bg-[#1B1B1B] px-4 py-2.5 rounded-xl text-[13.5px] leading-relaxed text-[#EDEDED] selection:bg-blue-500/20 shadow-sm max-w-[95%] break-words whitespace-pre-wrap border-none">
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
        <div className="flex flex-col gap-2 font-sans w-full">
            <div className="pl-1 flex flex-col gap-2">
                {/* Assistant status indicator */}
                {(isThinkingPhase || isBuildingPhase) &&
                    currentStatusLabel &&
                    (!hasBlocks || !runningBlock) && (
                        <div className="flex items-center gap-2 py-0.5 font-sans">
                            <CliSpinner label={currentStatusLabel} />
                        </div>
                    )}

                {/* Structured Multi-Block Execution View */}
                {hasBlocks ? (
                    <div className="flex flex-col gap-0.5 w-full">
                        {blocks.map((block, bIdx) => {
                            if (block.type === 'thinking') {
                                return (
                                    <CollapsibleThoughtView
                                        key={bIdx}
                                        content={block.content}
                                        isStreaming={block.isStreaming ?? isThinkingPhase}
                                    />
                                )
                            }

                            if (block.type === 'compaction') {
                                return (
                                    <div
                                        key={bIdx}
                                        className="my-1.5 py-1 text-xs text-[#fef08a] italic font-sans flex flex-col gap-0.5"
                                    >
                                        <span className="font-normal">Context Compacted</span>
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
                                    />
                                )
                            }

                            if (block.type === 'file_change') {
                                return null
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
                                            block.color && 'text-[#F87171]'
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
                                        className="py-1 text-[13px] leading-relaxed text-[#F87171] font-sans select-text whitespace-pre-wrap"
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
                                isStreaming={isThinkingPhase}
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
            </div>
        </div>
    )
}

export const ChatMessage = React.memo(ChatMessageComponent)
