import { GitCommit, FileText, Copy, Check, Search } from 'lucide-react'
import React, { useState } from 'react'

import { useAppStore } from '@/app/store'
import { extractSessionFileDiffs } from '@/features/preview/utils/diffParser'
import { cn } from '@/shared/lib/utils'

export const ChangesWorkspace: React.FC = () => {
    const messages = useAppStore((state) => state.messages)
    const fileDiffs = extractSessionFileDiffs(messages)

    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
        fileDiffs[0]?.filePath || null
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [copied, setCopied] = useState(false)

    const activeDiff = fileDiffs.find((f) => f.filePath === selectedFilePath) || fileDiffs[0]

    const filteredFiles = fileDiffs.filter((f) =>
        f.filePath.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCopyDiff = () => {
        if (!activeDiff?.diff) return
        navigator.clipboard.writeText(activeDiff.diff).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    if (fileDiffs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] text-[#8E8D8C] select-none p-6 font-sans w-full h-full">
                <div className="flex flex-col items-center gap-3 max-w-sm text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1AA]">
                        <GitCommit className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-semibold text-[#EDEDEF]">
                            No pending changes
                        </span>
                        <span className="text-[12px] text-[#8E8D8C]">
                            Modified files and git diffs will appear here as changes are made.
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-row bg-[#141414] text-[#EDEDED] font-sans w-full h-full overflow-hidden border-t border-[#222225]">
            {/* Left File List Sidebar */}
            <div className="w-64 border-r border-[#222225] flex flex-col h-full bg-[#121212] shrink-0">
                <div className="p-2.5 border-b border-[#222225] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#EDEDEF]">
                            Changed Files ({fileDiffs.length})
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8D8C]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter files..."
                            className="w-full bg-[#1A1A1C] text-xs text-[#EDEDED] placeholder-[#8E8D8C] pl-7 pr-2.5 py-1.5 rounded-lg border border-[#2A2A2D] focus:outline-none focus:border-[#3B82F6]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10">
                    {filteredFiles.map((item) => {
                        const isSelected =
                            item.filePath === (activeDiff?.filePath || selectedFilePath)

                        return (
                            <button
                                key={item.filePath}
                                type="button"
                                onClick={() => setSelectedFilePath(item.filePath)}
                                className={cn(
                                    'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left group cursor-pointer outline-none',
                                    isSelected
                                        ? 'bg-[#1E1E20] text-white border border-[#2E2E32]'
                                        : 'text-[#8E8D8C] hover:bg-[#18181A] hover:text-[#EDEDEF]'
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                    <span className="truncate font-mono text-[11.5px]">
                                        {item.filePath}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10.5px]">
                                    {item.additions > 0 && (
                                        <span className="text-[#6EE7B7]">+{item.additions}</span>
                                    )}
                                    {item.deletions > 0 && (
                                        <span className="text-[#FCA5A5]">-{item.deletions}</span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Main Terminal Diff Viewer Area */}
            <div className="flex-1 flex flex-col h-full bg-[#0D0D0D] overflow-hidden">
                {activeDiff ? (
                    <>
                        {/* Diff Header */}
                        <div className="h-10 px-4 flex items-center justify-between border-b border-[#222225] bg-[#141414] shrink-0">
                            <div className="flex items-center gap-2 font-mono text-xs text-[#EDEDED] truncate">
                                <span className="text-[#8E8D8C]">{activeDiff.action}:</span>
                                <span className="font-semibold">{activeDiff.filePath}</span>
                                <div className="flex items-center gap-1.5 ml-2 text-[11px]">
                                    {activeDiff.additions > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#122f1e] text-[#6EE7B7] font-semibold">
                                            +{activeDiff.additions}
                                        </span>
                                    )}
                                    {activeDiff.deletions > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#3f1316] text-[#FCA5A5] font-semibold">
                                            -{activeDiff.deletions}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyDiff}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E1E20] hover:bg-[#28282B] text-xs text-[#EDEDEF] border border-[#2E2E32] transition-colors cursor-pointer"
                                title="Copy full diff"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 text-[#8E8D8C]" />
                                        <span>Copy Diff</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Diff Terminal Body */}
                        <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed selection:bg-blue-500/20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
                            <div className="flex flex-col space-y-0.5">
                                {activeDiff.diff.split(/\r?\n/).map((line, idx) => {
                                    const isAdded = line.startsWith('+') && !line.startsWith('+++')
                                    const isRemoved =
                                        line.startsWith('-') && !line.startsWith('---')
                                    const isHunkHeader =
                                        line.startsWith('@@') ||
                                        line.startsWith('---') ||
                                        line.startsWith('+++')

                                    return (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'flex items-start px-2 py-0.5 rounded font-mono select-text transition-colors whitespace-pre-wrap break-all',
                                                isAdded && 'bg-[#122f1e] text-[#6EE7B7]',
                                                isRemoved && 'bg-[#3f1316] text-[#FCA5A5]',
                                                isHunkHeader &&
                                                    'text-[#d1d5db] font-semibold opacity-90',
                                                !isAdded &&
                                                    !isRemoved &&
                                                    !isHunkHeader &&
                                                    'text-[#94a3b8]'
                                            )}
                                        >
                                            <span className="w-8 shrink-0 text-[#64748b] select-none text-right pr-3 opacity-60">
                                                {idx + 1}
                                            </span>
                                            <span className="flex-1">{line}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[#8E8D8C] text-xs">
                        Select a file to inspect diffs
                    </div>
                )}
            </div>
        </div>
    )
}
