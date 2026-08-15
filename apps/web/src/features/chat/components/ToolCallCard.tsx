import React from 'react'

import { CliSpinner } from './CliSpinner'

import { getToolSummary, getToolActionLabel } from '@/features/chat/utils/toolFormatter'

export interface ToolCallCardProps {
    toolCallId?: string
    toolName: string
    toolInput?: any
    status: 'running' | 'success' | 'error'
    output?: string
    expandCommands?: boolean
}

function renderFormattedToolSummary(toolSummary: string, isError = false) {
    const match = toolSummary.match(/^([A-Za-z_]+)\(([\s\S]*)\)$/)
    if (match) {
        let args = (match[2] || '').replace(/\r?\n/g, ' ')
        if (args.length > 80) {
            args = args.substring(0, 80) + '...'
        }
        return (
            <span className="flex items-center gap-1 font-mono text-[12.5px] truncate">
                <span
                    className={
                        isError ? 'text-[#f87171] font-normal' : 'text-[#fef08a] font-normal'
                    }
                >
                    ● {match[1]}
                </span>
                <span className="text-[#cbd5e1]">({args})</span>
            </span>
        )
    }
    return (
        <span
            className={
                isError
                    ? 'font-mono text-[12.5px] text-[#f87171] truncate'
                    : 'font-mono text-[12.5px] text-white truncate'
            }
        >
            {toolSummary}
        </span>
    )
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolName, toolInput, status }) => {
    const isRunning = status === 'running'
    const isError = status === 'error'
    const summaryText = getToolSummary(toolName, toolInput)
    const actionLabel = getToolActionLabel(toolName)

    if (isRunning) {
        return (
            <div className="flex items-center gap-2 py-0.5 text-[12.5px] font-sans">
                <CliSpinner label={actionLabel} />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 py-0.5 select-text font-sans leading-tight">
            {renderFormattedToolSummary(summaryText, isError)}
        </div>
    )
}
