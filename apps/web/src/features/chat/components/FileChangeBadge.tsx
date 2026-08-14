import { FileCode2, ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

import { cn } from '@/shared/lib/utils'

export interface FileChangeBadgeProps {
    filePath: string
    action: 'created' | 'modified' | 'deleted'
    diff?: string
    onOpenFile?: (path: string) => void
}

export const FileChangeBadge: React.FC<FileChangeBadgeProps> = ({
    filePath,
    action,
    diff,
    onOpenFile,
}) => {
    const [isDiffExpanded, setIsDiffExpanded] = useState(false)

    const actionBadge = {
        created: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        modified: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        deleted: 'bg-red-500/10 text-red-400 border-red-500/20',
    }[action]

    return (
        <div className="w-full my-1.5 font-sans">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#181818] border border-white/10 select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileCode2 size={13} className="text-[#8E8D8C] shrink-0" />
                    <span
                        onClick={() => onOpenFile?.(filePath)}
                        className="text-[11.5px] font-mono text-white/90 hover:underline cursor-pointer truncate"
                        title={filePath}
                    >
                        {filePath}
                    </span>
                    <span
                        className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0',
                            actionBadge
                        )}
                    >
                        {action}
                    </span>
                </div>

                {diff && (
                    <button
                        type="button"
                        onClick={() => setIsDiffExpanded(!isDiffExpanded)}
                        className="flex items-center gap-1 text-[11px] text-[#8E8D8C] hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                        <span>{isDiffExpanded ? 'Hide diff' : 'Show diff'}</span>
                        <ChevronDown
                            size={12}
                            className={cn(
                                'transition-transform duration-200',
                                isDiffExpanded ? 'rotate-0' : '-rotate-90'
                            )}
                        />
                    </button>
                )}
            </div>

            {isDiffExpanded && diff && (
                <div className="mt-1 bg-[#0D0D0D] border border-white/10 rounded-xl p-3 overflow-x-auto max-h-60 font-mono text-[11px] leading-relaxed select-text [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10">
                    {diff.split('\n').map((line, idx) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++')
                        const isDel = line.startsWith('-') && !line.startsWith('---')
                        return (
                            <div
                                key={idx}
                                className={cn(
                                    'whitespace-pre',
                                    isAdd && 'text-emerald-400 bg-emerald-950/30',
                                    isDel && 'text-red-400 bg-red-950/30',
                                    !isAdd && !isDel && 'text-[#9E9E9E]'
                                )}
                            >
                                {line}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
