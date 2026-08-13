import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import React from 'react'
// chevronright is still used for folder expansion in the tree, chevrondown for open state

import type { CodeFilePath, CodeFileTreeNode } from '@/features/preview/types'

import { cn } from '@/shared/lib/utils'

interface CodeWorkspaceFileSidebarProps {
    tree: CodeFileTreeNode[]
    selectedFile: CodeFilePath
    onSelectFile: (path: CodeFilePath) => void
    onPinFile: (path: CodeFilePath) => void
}

const collectFolderPaths = (nodes: CodeFileTreeNode[]): string[] =>
    nodes.flatMap((node) => {
        if (node.type === 'file') {
            return []
        }

        return [node.path, ...collectFolderPaths(node.children)]
    })

export const CodeWorkspaceFileSidebar: React.FC<CodeWorkspaceFileSidebarProps> = ({
    tree,
    selectedFile,
    onSelectFile,
    onPinFile,
}) => {
    const allFolderPaths = React.useMemo(() => collectFolderPaths(tree), [tree])
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
        () => new Set(allFolderPaths)
    )

    React.useEffect(() => {
        setExpandedFolders(new Set(allFolderPaths))
    }, [allFolderPaths])

    const isFullyExpanded =
        allFolderPaths.length > 0 && expandedFolders.size === allFolderPaths.length

    const handleToggleAllFolders = () => {
        setExpandedFolders(isFullyExpanded ? new Set() : new Set(allFolderPaths))
    }

    const toggleFolder = (path: string) => {
        setExpandedFolders((previous) => {
            const next = new Set(previous)
            if (next.has(path)) {
                next.delete(path)
            } else {
                next.add(path)
            }
            return next
        })
    }

    const renderTree = (nodes: CodeFileTreeNode[], depth: number): React.ReactNode =>
        nodes.map((node) => {
            if (node.type === 'file') {
                const isActive = selectedFile === node.file.path

                return (
                    <button
                        key={node.file.path}
                        onClick={() => onSelectFile(node.file.path)}
                        onDoubleClick={() => onPinFile(node.file.path)}
                        className={cn(
                            'w-full flex items-center gap-2 py-1 rounded text-left text-[13px] transition-colors',
                            isActive
                                ? 'bg-[#2a2d2e] text-[#d4d4d4]'
                                : 'text-[#c5c5c5] hover:bg-[#252526]'
                        )}
                        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
                        title="Double-click to pin in tabs"
                    >
                        <FileText
                            size={14}
                            className={cn(
                                'shrink-0',
                                isActive ? 'text-[#d4d4d4]' : 'text-[#858585]'
                            )}
                        />
                        <span className="truncate">{node.file.label}</span>
                    </button>
                )
            }

            const isExpanded = expandedFolders.has(node.path)

            return (
                <div key={node.path}>
                    <button
                        onClick={() => toggleFolder(node.path)}
                        className="w-full flex items-center gap-1 py-1 rounded text-left text-[13px] text-[#c5c5c5] hover:bg-[#252526]"
                        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} className="shrink-0 text-[#858585]" />
                        ) : (
                            <ChevronRight size={14} className="shrink-0 text-[#858585]" />
                        )}
                        <Folder size={14} className="shrink-0 text-[#d7ba7d]" />
                        <span className="truncate">{node.name}</span>
                    </button>

                    {isExpanded && <div>{renderTree(node.children, depth + 1)}</div>}
                </div>
            )
        })

    return (
        <aside className="w-64 shrink-0 border-r border-[#2d2d2d] bg-[#141414] flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#383736]/60 hover:[&::-webkit-scrollbar-thumb]:bg-[#4A4948]/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {renderTree(tree, 0)}
            </div>
        </aside>
    )
}
