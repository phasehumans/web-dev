import { Check, Copy, X } from 'lucide-react'
import React from 'react'

import type { CodeFile, CodeFilePath } from '@/features/preview/types'

import { Tooltip } from '@/shared/components/ui/Tooltip'
import { cn } from '@/shared/lib/utils'

interface CodeWorkspaceEditorHeaderProps {
    activeFile: CodeFile | null
    openFiles: CodeFile[]
    onSelectFile: (path: CodeFilePath) => void
    onCloseFile: (path: CodeFilePath) => void
    fileContent: string
}

interface HeaderTab {
    file: CodeFile
    isPreview: boolean
}

const getTabs = (activeFile: CodeFile | null, openFiles: CodeFile[]): HeaderTab[] => {
    if (!activeFile) {
        return openFiles.map((file) => ({ file, isPreview: false }))
    }

    const isActivePinned = openFiles.some((file) => file.path === activeFile.path)

    if (isActivePinned) {
        return openFiles.map((file) => ({ file, isPreview: false }))
    }

    return [
        ...openFiles.map((file) => ({ file, isPreview: false })),
        { file: activeFile, isPreview: true },
    ]
}

const getFileIcon = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) {
        return (
            <svg
                viewBox="-11.5 -10.23174 23 20.46348"
                className="w-3.5 h-3.5 text-[#38BDF8] shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
            >
                <circle cx="0" cy="0" r="2.05" fill="currentColor" stroke="none" />
                <g stroke="currentColor">
                    <ellipse rx="11" ry="4.2" />
                    <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                    <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                </g>
            </svg>
        )
    }

    if (path.endsWith('.ts')) {
        return (
            <span className="px-1 py-[0.5px] rounded bg-[#1D3B66] text-[#60A5FA] text-[8px] font-mono font-bold leading-none select-none shrink-0">
                TS
            </span>
        )
    }

    if (path.endsWith('.html')) {
        return (
            <span className="px-1 py-[0.5px] rounded bg-[#4C2417] text-[#EA580C] text-[8px] font-mono font-bold leading-none select-none shrink-0">
                &lt;&gt;
            </span>
        )
    }

    if (path.endsWith('.css')) {
        return (
            <span className="px-1 py-[0.5px] rounded bg-[#16384C] text-[#38BDF8] text-[8px] font-mono font-bold leading-none select-none shrink-0">
                #
            </span>
        )
    }

    return (
        <span className="px-1 py-[0.5px] rounded bg-[#3B3419] text-[#EAB308] text-[8px] font-mono font-bold leading-none select-none shrink-0">
            JS
        </span>
    )
}

export const CodeWorkspaceEditorHeader: React.FC<CodeWorkspaceEditorHeaderProps> = ({
    activeFile,
    openFiles,
    onSelectFile,
    onCloseFile,
    fileContent,
}) => {
    const [copied, setCopied] = React.useState(false)
    const tabs = React.useMemo(() => getTabs(activeFile, openFiles), [activeFile, openFiles])

    const handleCopy = async () => {
        if (!fileContent) return
        try {
            await navigator.clipboard.writeText(fileContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Intentionally swallowed: clipboard permission or iframe focus fallback
        }
    }

    if (tabs.length === 0 && !activeFile) {
        return null
    }

    return (
        <div className="h-9 shrink-0 border-b border-[#202020] bg-[#141414] flex items-center justify-between px-2 gap-2">
            <div className="flex-1 h-full flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {tabs.map((tab) => {
                    const isActive = tab.file.path === activeFile?.path

                    return (
                        <div
                            key={`${tab.file.path}-${tab.isPreview ? 'preview' : 'pinned'}`}
                            className={cn(
                                'h-6.5 min-w-0 max-w-[200px] flex items-center rounded-full px-2.5 gap-1.5 shrink-0 transition-all select-none cursor-pointer',
                                isActive
                                    ? 'bg-[#222222] text-[#EDEDED] font-medium'
                                    : 'bg-transparent text-[#8E8D8C] hover:bg-white/5 hover:text-[#EDEDED]'
                            )}
                            onClick={() => onSelectFile(tab.file.path)}
                        >
                            {getFileIcon(tab.file.path)}

                            <span
                                className={cn(
                                    'min-w-0 truncate text-[12px] text-left outline-none',
                                    tab.isPreview && 'italic text-[#A0A0A5]'
                                )}
                            >
                                {tab.file.label}
                            </span>

                            <Tooltip content={`Close ${tab.file.label}`} position="bottom">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onCloseFile(tab.file.path)
                                    }}
                                    className="shrink-0 text-[#71717A] hover:text-[#EDEDED] outline-none cursor-pointer p-0.5 rounded-full hover:bg-white/10 ml-0.5 transition-colors flex items-center justify-center"
                                    aria-label={`Close ${tab.file.label}`}
                                >
                                    <X size={11} />
                                </button>
                            </Tooltip>
                        </div>
                    )
                })}
            </div>

            {activeFile && (
                <div className="flex items-center gap-1 shrink-0">
                    <Tooltip
                        content={copied ? 'Copied!' : 'Copy file content'}
                        position="bottom"
                        align="end"
                    >
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1 rounded-md text-[#8E8D8C] hover:text-white hover:bg-white/5 transition-colors outline-none cursor-pointer"
                        >
                            {copied ? (
                                <Check size={13} className="text-emerald-400" />
                            ) : (
                                <Copy size={13} />
                            )}
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    )
}
