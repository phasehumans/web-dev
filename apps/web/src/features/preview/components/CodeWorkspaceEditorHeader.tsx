import { X } from 'lucide-react'
import React from 'react'

import type { CodeFile, CodeFilePath } from '@/features/preview/types'

import { cn } from '@/shared/lib/utils'

interface CodeWorkspaceEditorHeaderProps {
    activeFile: CodeFile | null
    openFiles: CodeFile[]
    onSelectFile: (path: CodeFilePath) => void
    onCloseFile: (path: CodeFilePath) => void
    wordWrap: boolean
    toggleWordWrap: () => void
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

export const CodeWorkspaceEditorHeader: React.FC<CodeWorkspaceEditorHeaderProps> = ({
    activeFile,
    openFiles,
    onSelectFile,
    onCloseFile,
    wordWrap,
    toggleWordWrap,
    fileContent,
}) => {
    const tabs = React.useMemo(() => getTabs(activeFile, openFiles), [activeFile, openFiles])

    return (
        <div className="h-10 shrink-0 border-b border-[#2d2d2d] bg-[#141414] flex items-center justify-between px-3">
            <div className="flex-1 h-full flex items-center gap-1 overflow-x-auto no-scrollbar">
                {tabs.length === 0 ? (
                    <span className="text-[12px] text-[#7a7a7a] px-2">No files yet</span>
                ) : (
                    tabs.map((tab) => {
                        const isActive = tab.file.path === activeFile?.path

                        return (
                            <div
                                key={`${tab.file.path}-${tab.isPreview ? 'preview' : 'pinned'}`}
                                className={cn(
                                    'h-7 min-w-0 max-w-[220px] flex items-center rounded-lg border px-2 gap-1.5 shrink-0',
                                    isActive
                                        ? 'bg-[#1E1E20] border-[#363539] text-[#EDEDED] shadow-sm font-medium'
                                        : 'bg-[#161618] border-[#262629] text-[#8F8E8D] hover:bg-[#1A1A1D] hover:text-[#D4D4D8]'
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectFile(tab.file.path)}
                                    className={cn(
                                        'min-w-0 truncate text-[12px] text-left outline-none',
                                        tab.isPreview && 'italic'
                                    )}
                                >
                                    {tab.file.label}
                                </button>

                                {!tab.isPreview && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            onCloseFile(tab.file.path)
                                        }}
                                        className="shrink-0 text-[#8b8b8b] hover:text-[#d4d4d4] outline-none"
                                        aria-label={`Close ${tab.file.label}`}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
