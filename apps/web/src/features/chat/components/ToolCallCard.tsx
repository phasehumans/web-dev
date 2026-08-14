import {
    ChevronDown,
    Terminal,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Copy,
    Check,
} from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

import { cn } from '@/shared/lib/utils'

export interface ToolCallCardProps {
    toolCallId: string
    toolName: string
    toolInput?: any
    status: 'running' | 'success' | 'error'
    output?: string
}

function formatToolArgs(toolName: string, input: any): string {
    if (!input) return ''
    if (typeof input === 'string') return input
    if (toolName.toLowerCase().includes('bash') || input.command) {
        return input.command || JSON.stringify(input)
    }
    if (input.filePath || input.path || input.file) {
        return input.filePath || input.path || input.file
    }
    if (input.pattern || input.query) {
        return `"${input.pattern || input.query}"`
    }
    if (input.url) {
        return input.url
    }
    try {
        const keys = Object.keys(input)
        if (keys.length === 1) return String(input[keys[0]])
        return JSON.stringify(input)
    } catch {
        return String(input)
    }
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
    toolName,
    toolInput,
    status,
    output,
}) => {
    const isRunning = status === 'running'
    const isError = status === 'error'
    const [isExpanded, setIsExpanded] = useState<boolean>(isRunning || Boolean(output))
    const [copied, setCopied] = useState(false)
    const outputContainerRef = useRef<HTMLDivElement | null>(null)

    const rawArgs = formatToolArgs(toolName, toolInput)
    const truncatedArgs = rawArgs.length > 80 ? `${rawArgs.slice(0, 80)}...` : rawArgs

    useEffect(() => {
        if (isRunning) {
            setIsExpanded(true)
        }
    }, [isRunning])

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

    return (
        <div className="w-full my-1.5 font-sans">
            <div
                onClick={() => output && setIsExpanded(!isExpanded)}
                className={cn(
                    'flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[#181818] border border-white/10 transition-colors select-none',
                    output ? 'cursor-pointer hover:border-white/20' : 'cursor-default'
                )}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Status Icon */}
                    <div className="shrink-0">
                        {isRunning && <Loader2 size={13} className="text-amber-400 animate-spin" />}
                        {!isRunning && !isError && (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                        )}
                        {isError && <AlertCircle size={13} className="text-red-400" />}
                    </div>

                    {/* Tool Name Pill */}
                    <span className="shrink-0 text-[11px] font-mono font-semibold text-amber-200/90 bg-amber-400/10 px-1.5 py-0.5 rounded">
                        ● {toolName}
                    </span>

                    {/* Tool Arguments */}
                    <span
                        className="text-[11.5px] font-mono text-[#D4D4D8] truncate opacity-90"
                        title={rawArgs}
                    >
                        {truncatedArgs || '()'}
                    </span>
                </div>

                {/* Right controls */}
                {output && (
                    <div className="flex items-center gap-1.5 shrink-0 text-[#8E8D8C]">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1 rounded hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

            {/* Expandable Output Terminal Box */}
            {isExpanded && output && (
                <div className="mt-1 bg-[#0D0D0D] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between px-3 py-1 bg-white/[0.03] border-b border-white/5 text-[10px] text-[#8E8D8C] font-mono">
                        <span className="flex items-center gap-1">
                            <Terminal size={11} /> Output
                        </span>
                        <span>{output.split('\n').length} lines</span>
                    </div>
                    <div
                        ref={outputContainerRef}
                        className="p-3 max-h-56 overflow-y-auto font-mono text-[11.5px] leading-relaxed text-[#EDEDED] whitespace-pre-wrap break-all [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10"
                    >
                        {output}
                    </div>
                </div>
            )}
        </div>
    )
}
