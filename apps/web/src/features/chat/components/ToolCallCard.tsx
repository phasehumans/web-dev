import { ChevronDown, Copy, Check, Loader2 } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

import {
    getToolSummary,
    getToolActionLabel,
    isNoOutputTool,
} from '@/features/chat/utils/toolFormatter'
import { cn } from '@/shared/lib/utils'

export interface ToolCallCardProps {
    toolCallId?: string
    toolName: string
    toolInput?: any
    status: 'running' | 'success' | 'error'
    output?: string
    expandCommands?: boolean
}

function renderFormattedToolSummary(toolSummary: string) {
    const match = toolSummary.match(/^([A-Za-z_]+)\(([\s\S]*)\)$/)
    if (match) {
        let args = (match[2] || '').replace(/\r?\n/g, ' ')
        if (args.length > 80) {
            args = args.substring(0, 80) + '...'
        }
        return (
            <span className="flex items-center gap-1 font-mono text-[12px] truncate">
                <span className="text-[#fef08a] font-bold">● {match[1]}</span>
                <span className="text-[#cbd5e1]">({args})</span>
            </span>
        )
    }
    return <span className="font-mono text-[12px] text-white truncate">{toolSummary}</span>
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
    toolName,
    toolInput,
    status,
    output,
    expandCommands,
}) => {
    const isRunning = status === 'running'
    const isError = status === 'error'
    const [userExpanded, setUserExpanded] = useState<boolean | null>(null)
    const isExpanded = userExpanded !== null ? userExpanded : (expandCommands ?? true)
    const [copied, setCopied] = useState(false)
    const outputContainerRef = useRef<HTMLDivElement | null>(null)

    const summaryText = getToolSummary(toolName, toolInput)
    const actionLabel = getToolActionLabel(toolName)
    const noOutput = isNoOutputTool(toolName)

    useEffect(() => {
        if (isExpanded && outputContainerRef.current) {
            outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight
        }
    }, [output, isExpanded])

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!output) return
        navigator.clipboard.writeText(output).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    // Running state with dynamic action label and trailing stream output
    if (isRunning) {
        const trailingLines = output ? output.trim().split(/\r?\n/).slice(-2) : []

        return (
            <div className="flex flex-col gap-1 my-1 font-sans">
                <div className="flex items-center gap-2 text-[12px] text-[#A1A09F]">
                    <Loader2 size={13} className="text-[#fef08a] animate-spin shrink-0" />
                    <span>{actionLabel}</span>
                </div>
                {trailingLines.length > 0 && (
                    <div className="flex flex-col pl-2 border-l border-white/10 font-mono text-[11px] text-[#94a3b8] leading-relaxed select-text">
                        {trailingLines.map((line, idx) => (
                            <div key={idx} className="truncate">
                                │ {line}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Completed read-only tool (single line representation)
    if (noOutput) {
        return (
            <div className="flex items-center gap-2 my-1 py-0.5 select-text font-sans">
                {renderFormattedToolSummary(summaryText)}
            </div>
        )
    }

    // Completed tool with potential output
    const lines = output ? output.trim().split(/\r?\n/) : []
    const MAX_VISIBLE_LINES = 20
    const visibleLines = isExpanded ? lines.slice(0, MAX_VISIBLE_LINES) : []
    const isTruncated = isExpanded && lines.length > MAX_VISIBLE_LINES
    const hasOutput = lines.length > 0

    return (
        <div className="flex flex-col my-1 font-sans">
            <div
                onClick={() => hasOutput && setUserExpanded(!isExpanded)}
                className={cn(
                    'flex items-center justify-between gap-2 py-0.5 transition-colors select-none group',
                    hasOutput ? 'cursor-pointer' : 'cursor-default'
                )}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {renderFormattedToolSummary(summaryText)}
                    {hasOutput && (
                        <span className="text-[11px] text-[#8E8D8C] hover:text-[#C4C3C2] transition-colors italic">
                            ({isExpanded ? 'ctrl+o to collapse' : 'ctrl+o to expand'})
                        </span>
                    )}
                </div>

                {hasOutput && (
                    <div className="flex items-center gap-1.5 shrink-0 text-[#8E8D8C]">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1 rounded hover:text-white hover:bg-white/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Copy output"
                        >
                            {copied ? (
                                <Check size={12} className="text-emerald-400" />
                            ) : (
                                <Copy size={12} />
                            )}
                        </button>
                        <ChevronDown
                            size={13}
                            className={cn(
                                'transition-transform duration-200',
                                isExpanded ? 'rotate-0' : '-rotate-90'
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Expandable Output Box for commands */}
            {isExpanded && hasOutput && (
                <div className="mt-1 pl-2 border-l border-white/10 flex flex-col font-mono text-[11.5px] leading-relaxed text-[#EDEDED] select-text">
                    {visibleLines.map((line, lidx) => (
                        <div key={lidx} className="truncate text-[#94a3b8]">
                            {line}
                        </div>
                    ))}
                    {isTruncated && (
                        <div className="text-[10.5px] text-[#64748b] pt-0.5">
                            ... ({lines.length - MAX_VISIBLE_LINES} more lines)
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
