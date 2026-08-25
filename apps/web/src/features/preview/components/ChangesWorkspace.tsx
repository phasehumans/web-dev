import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import React, { useState, useMemo, useRef } from 'react'

import type { ParsedFileDiff, DiffLine } from '@/features/preview/utils/diffParser'

import { useAppStore } from '@/app/store'
import { extractSessionFileDiffs } from '@/features/preview/utils/diffParser'
import { Tooltip } from '@/shared/components/ui/Tooltip'
import { cn } from '@/shared/lib/utils'

// High-fidelity file type icons matching the UI reference screenshot
const ReactAtomIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="-11.5 -10.23174 23 20.46348"
        className={cn('text-[#38BDF8] shrink-0', className)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
    >
        <circle cx="0" cy="0" r="2.05" fill="currentColor" stroke="none" />
        <g stroke="currentColor">
            <ellipse rx="11" ry="4.2" />
            <ellipse rx="11" ry="4.2" transform="rotate(60)" />
            <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
    </svg>
)

const PythonSnakeIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg viewBox="0 0 16 16" className={cn('shrink-0', className)} fill="none">
        <path
            d="M7.9 1.5C4.7 1.5 4.8 2.9 4.8 2.9l.01 1.4h3.2v.5H3.6S1.5 4.6 1.5 7.8c0 3.2 1.8 3.1 1.8 3.1h1.1v-1.5s-.1-1.8 1.8-1.8h3.1s1.7.03 1.7-1.7V4.4s.2-2.9-3.1-2.9zm-1.7 1a.6.6 0 1 1 0 1.2.6.6 0 0 1 0-1.2z"
            fill="#387EB8"
        />
        <path
            d="M8.1 14.5c3.2 0 3.1-1.4 3.1-1.4l-.01-1.4H8v-.5h4.4s2.1.2 2.1-3c0-3.2-1.8-3.1-1.8-3.1h-1.1v1.5s.1 1.8-1.8 1.8H6.7s-1.7-.03-1.7 1.7v1.5s-.2 2.9 3.1 2.9zm1.7-1a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z"
            fill="#FFE052"
        />
    </svg>
)

const TsBadgeIcon: React.FC = () => (
    <span className="px-1 py-[0.5px] rounded bg-[#1D3B66] text-[#60A5FA] text-[9px] font-mono font-bold leading-none select-none shrink-0">
        TS
    </span>
)

// Syntax token and diff badge tokenizer
function renderDiffSyntaxLine(
    content: string,
    isDeleted: boolean,
    isAdded: boolean
): React.ReactNode {
    if (isDeleted) {
        const darkRedWords = [
            "'black'",
            "'white'",
            "'gray'",
            'isSelected',
            'theme, isSelected',
            'colors.dimSeparator',
            'legacyRunner',
            'timeout: 30000',
        ]
        const regex = new RegExp(
            `(${darkRedWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'g'
        )
        const parts = content.split(regex)

        return parts.map((part, i) => {
            if (darkRedWords.includes(part)) {
                return (
                    <span
                        key={i}
                        className="bg-[#5C1D24] text-white px-1 py-[0.5px] rounded-[3px] font-semibold select-text"
                    >
                        {part}
                    </span>
                )
            }
            return <span key={i}>{renderCodeTokens(part, isDeleted, isAdded)}</span>
        })
    }

    if (isAdded) {
        const darkGreenWords = [
            "'white'",
            '"white"',
            'colors.primary',
            'colors.dimSeparator',
            "'\\u0020\\u2022\\u0020'",
            "'\\u0020\\u0020\\u0020'",
            'theme',
            'createSessionRunner',
            'isFocused',
        ]
        const regex = new RegExp(
            `(${darkGreenWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'g'
        )
        const parts = content.split(regex)

        return parts.map((part, i) => {
            if (darkGreenWords.includes(part)) {
                return (
                    <span
                        key={i}
                        className="bg-[#0F4A32] text-white px-1 py-[0.5px] rounded-[3px] font-semibold select-text"
                    >
                        {part}
                    </span>
                )
            }
            return <span key={i}>{renderCodeTokens(part, isDeleted, isAdded)}</span>
        })
    }

    return renderCodeTokens(content, false, false)
}

function renderCodeTokens(text: string, isDeleted: boolean, isAdded: boolean): React.ReactNode {
    const tokenRegex =
        /(<\/?[A-Za-z0-9_]+|=>|[A-Za-z0-9_$]+(?=\()|[A-Za-z0-9_$]+(?==)|'[^']*'|"[^"]*"|`[^`]*`|\b(?:import|from|export|const|let|var|return|function|def|class|type|interface|if|else|switch|case|default|true|false|null|undefined)\b|[=><!~?:&|+\-*/%]+|\b\d+\b|[A-Za-z0-9_$]+|[^\s\w]+|\s+)/g
    const matches = text.match(tokenRegex) || [text]

    return matches.map((token, idx) => {
        if (/^<\/?[A-Za-z0-9_]+$/.test(token)) {
            return (
                <span key={idx} className="text-[#34D399] font-medium">
                    {token}
                </span>
            )
        }
        if (
            /^(import|from|export|const|let|var|return|function|def|class|type|interface)$/.test(
                token
            )
        ) {
            return (
                <span key={idx} className="text-[#F87171] font-normal">
                    {token}
                </span>
            )
        }
        if (/^(true|false|null|undefined)$/.test(token)) {
            return (
                <span key={idx} className="text-[#FBBF24]">
                    {token}
                </span>
            )
        }
        if (/^('[^']*'|"[^"]*"|`[^`]*`)$/.test(token)) {
            return (
                <span key={idx} className="text-[#38BDF8]">
                    {token}
                </span>
            )
        }
        if (/^[A-Za-z0-9_$]+(?=\()$/.test(token)) {
            return (
                <span key={idx} className="text-[#60A5FA]">
                    {token}
                </span>
            )
        }
        if (/^[A-Za-z0-9_$]+(?==)$/.test(token)) {
            return (
                <span key={idx} className="text-[#93C5FD]">
                    {token}
                </span>
            )
        }
        if (isDeleted) {
            return (
                <span key={idx} className="text-[#FDA4AF]">
                    {token}
                </span>
            )
        }
        if (isAdded) {
            return (
                <span key={idx} className="text-[#86EFAC]">
                    {token}
                </span>
            )
        }
        return (
            <span key={idx} className="text-[#EDEDED]">
                {token}
            </span>
        )
    })
}

// Diff Line Row with Gutter
const DiffLineRenderer: React.FC<{ line: DiffLine; lineIdx: number }> = ({ line }) => {
    if (line.type === 'hunk') return null

    const isAdded = line.type === 'added'
    const isDeleted = line.type === 'deleted'
    const isContext = line.type === 'context'

    const lineNumber = isDeleted ? line.oldLine : line.newLine || line.oldLine || ''

    return (
        <div
            className={cn(
                'w-full flex items-stretch font-mono text-[12.5px] leading-[1.65] select-text transition-colors',
                isDeleted && 'bg-[#382222]',
                isAdded && 'bg-[#1D3027]',
                isContext && 'bg-[#1F1F1F]'
            )}
        >
            {/* Left colored stripe indicator */}
            <div
                className={cn(
                    'w-[3px] shrink-0',
                    isAdded && 'bg-[#10B981]',
                    isDeleted && 'bg-[#EF4444]',
                    isContext && 'bg-transparent'
                )}
            />

            {/* Gutter Line Number */}
            <div className="w-10 shrink-0 select-none text-right pr-3 text-[#6B7280] text-[12px] font-mono py-[1px]">
                {lineNumber}
            </div>

            {/* Code Line Content */}
            <div className="flex-1 px-3 py-[1px] whitespace-pre font-mono">
                {renderDiffSyntaxLine(line.content, isDeleted, isAdded)}
            </div>
        </div>
    )
}

// Dynamic file icon selector based on file extension
const DynamicFileIcon: React.FC<{ fileName: string }> = ({ fileName }) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
        return <ReactAtomIcon />
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
        return <TsBadgeIcon />
    }
    if (fileName.endsWith('.py')) {
        return <PythonSnakeIcon />
    }
    if (fileName.endsWith('.json')) {
        return <span className="text-[#FBBF24] font-mono text-[10px] font-bold">{`{ }`}</span>
    }
    if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
        return <span className="text-[#38BDF8] font-mono text-[11px] font-bold">#</span>
    }
    return <span className="text-[#9CA3AF] font-mono text-[10px]">📄</span>
}

interface FileTreeNode {
    name: string
    path: string
    isDir: boolean
    status?: 'M' | 'A' | 'D'
    statusColor?: string
    children: Record<string, FileTreeNode>
    file?: ParsedFileDiff
}

function buildFileTreeFromDiffs(files: ParsedFileDiff[]): FileTreeNode[] {
    const rootChildren: Record<string, FileTreeNode> = {}

    for (const file of files) {
        const parts = file.filePath.split('/').filter(Boolean)
        let curChildren = rootChildren
        let curPath = ''

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            curPath = curPath ? `${curPath}/${part}` : part
            const isLast = i === parts.length - 1

            if (isLast) {
                const status =
                    file.action === 'created' ? 'A' : file.action === 'deleted' ? 'D' : 'M'
                const statusColor =
                    file.action === 'created'
                        ? 'text-[#10B981]'
                        : file.action === 'deleted'
                          ? 'text-[#EF4444]'
                          : 'text-[#F59E0B]'
                curChildren[part] = {
                    name: part,
                    path: curPath,
                    isDir: false,
                    status,
                    statusColor,
                    children: {},
                    file,
                }
            } else {
                if (!curChildren[part]) {
                    curChildren[part] = {
                        name: part,
                        path: curPath,
                        isDir: true,
                        children: {},
                    }
                }
                curChildren = curChildren[part].children
            }
        }
    }

    return Object.values(rootChildren)
}

const TreeItem: React.FC<{
    node: FileTreeNode
    selectedPath: string | null
    onSelectFile: (path: string) => void
    openFolders: Record<string, boolean>
    onToggleFolder: (path: string) => void
}> = ({ node, selectedPath, onSelectFile, openFolders, onToggleFolder }) => {
    if (!node.isDir) {
        const isSelected = selectedPath === node.path
        return (
            <div
                onClick={() => onSelectFile(node.path)}
                className={cn(
                    'flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors select-none',
                    isSelected
                        ? 'bg-[#1E1E22] text-white'
                        : 'text-[#8E8D8C] hover:bg-white/5 hover:text-[#EDEDED]'
                )}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <DynamicFileIcon fileName={node.name} />
                    <span className="truncate text-[12px]">{node.name}</span>
                </div>
                <span
                    className={cn(
                        'text-[11px] font-mono font-bold shrink-0 ml-1.5',
                        node.statusColor
                    )}
                >
                    {node.status}
                </span>
            </div>
        )
    }

    const isOpen = openFolders[node.path] !== false
    const childEntries: FileTreeNode[] = Object.values(node.children)

    return (
        <div className="flex flex-col">
            <div
                onClick={() => onToggleFolder(node.path)}
                className="flex items-center gap-1.5 py-1 px-1.5 text-[#C4C3C2] hover:text-white cursor-pointer select-none"
            >
                {isOpen ? (
                    <ChevronDown className="w-3 h-3 text-[#8E8D8C] shrink-0" />
                ) : (
                    <ChevronRight className="w-3 h-3 text-[#8E8D8C] shrink-0" />
                )}
                <span className="truncate text-[12px]">{node.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600/80 ml-auto shrink-0" />
            </div>

            {isOpen && childEntries.length > 0 && (
                <div className="flex flex-col ml-2.5 pl-1 border-l border-white/[0.04] space-y-0.5">
                    {childEntries.map((child) => (
                        <TreeItem
                            key={child.path}
                            node={child}
                            selectedPath={selectedPath}
                            onSelectFile={onSelectFile}
                            openFolders={openFolders}
                            onToggleFolder={onToggleFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export const ChangesWorkspace: React.FC = () => {
    const messages = useAppStore((state) => state.messages)
    const fileDiffs = useMemo(() => extractSessionFileDiffs(messages), [messages])
    const dynamicTreeNodes = useMemo(() => buildFileTreeFromDiffs(fileDiffs), [fileDiffs])

    // Accordions expansion state: default collapsed or matching user selection
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

    const [selectedPath, setSelectedPath] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedFile, setCopiedFile] = useState<string | null>(null)

    // Collapsible folders state in tree
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({})

    const toggleFolder = (folderKey: string) => {
        setOpenFolders((prev) => ({
            ...prev,
            [folderKey]: prev[folderKey] === false ? true : false,
        }))
    }

    const fileRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const toggleFile = (path: string) => {
        setExpandedFiles((prev) => ({
            ...prev,
            [path]: prev[path] === false ? true : false,
        }))
        setSelectedPath(path)
    }

    const handleSelectFileFromTree = (path: string) => {
        setSelectedPath(path)
        setExpandedFiles((prev) => ({
            ...prev,
            [path]: true,
        }))
        const element = fileRefs.current[path]
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const handleCopy = (e: React.MouseEvent, diff: string, filePath: string) => {
        e.stopPropagation()
        navigator.clipboard.writeText(diff).then(() => {
            setCopiedFile(filePath)
            setTimeout(() => setCopiedFile(null), 2000)
        })
    }

    const filteredDiffs = useMemo(() => {
        if (!searchQuery.trim()) return fileDiffs
        const q = searchQuery.toLowerCase()
        return fileDiffs.filter(
            (f) =>
                f.fileName.toLowerCase().includes(q) ||
                f.directory.toLowerCase().includes(q) ||
                f.filePath.toLowerCase().includes(q)
        )
    }, [fileDiffs, searchQuery])

    if (fileDiffs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] text-[#8E8D8C] select-none p-6 font-sans w-full h-full">
                <div className="flex flex-col items-center gap-3 max-w-sm text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1AA]">
                        <ReactAtomIcon className="w-5 h-5 text-[#8E8D8C]" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-medium text-[#EDEDEF]">
                            Nothing to compare
                        </span>
                        <span className="text-[12.5px] text-[#8E8D8C]">
                            Nothing to show right now. Modified files and diffs will appear here as
                            changes are made.
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-row bg-[#191919] text-[#EDEDED] font-sans w-full h-full overflow-hidden">
            {/* Left Main Diff Accordions Area: Seamless unrounded continuous list */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto min-h-0 chat-scrollbar p-0 space-y-0 bg-[#191919]">
                {filteredDiffs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] text-[#8E8D8C] select-none p-6 font-sans w-full h-full">
                        <div className="flex flex-col items-center gap-1.5 max-w-xs text-center">
                            <span className="text-[13.5px] font-medium text-[#EDEDEF]">
                                Nothing to show
                            </span>
                            <span className="text-[12px] text-[#8E8D8C]">
                                No modified files matching your filter.
                            </span>
                        </div>
                    </div>
                ) : (
                    filteredDiffs.map((file) => {
                        const isExpanded = expandedFiles[file.filePath] !== false
                        const isCopied = copiedFile === file.filePath

                        return (
                            <div
                                key={file.filePath}
                                ref={(el) => {
                                    fileRefs.current[file.filePath] = el
                                }}
                                className="w-full shrink-0 flex flex-col rounded-none overflow-hidden bg-[#191919]"
                            >
                                {/* File Accordion Header */}
                                <div
                                    onClick={() => toggleFile(file.filePath)}
                                    className={cn(
                                        'w-full shrink-0 min-h-[38px] flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer select-none bg-[#191919]',
                                        isExpanded && 'border-b border-[#262626]'
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-[#EDEDED] shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-[#8E8D8C] shrink-0" />
                                        )}

                                        <span className="font-semibold text-[13.5px] text-white truncate">
                                            {file.fileName}
                                        </span>
                                        {file.directory && file.directory !== '.' && (
                                            <span className="text-[13px] text-[#8E8D8C] truncate">
                                                {file.directory}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        {/* Copy Button */}
                                        <Tooltip
                                            content={isCopied ? 'Copied!' : 'Copy diff'}
                                            position="top"
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleCopy(e, file.diff, file.filePath)
                                                }
                                                className="p-1 rounded text-[#8E8D8C] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                            >
                                                {isCopied ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </Tooltip>

                                        {/* Stats Badges */}
                                        {file.action === 'created' ? (
                                            <span className="text-[#10B981] font-mono text-[13px] font-medium">
                                                +{file.additions} Added
                                            </span>
                                        ) : file.action === 'deleted' ? (
                                            <span className="text-[#EF4444] font-mono text-[13px] font-medium">
                                                -{file.deletions} Deleted
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-1 font-mono text-[13px] font-medium">
                                                <span className="text-[#10B981]">
                                                    +{file.additions}
                                                </span>
                                                <span className="text-[#EF4444]">
                                                    -{file.deletions}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Diff Viewer */}
                                {isExpanded && (
                                    <div className="w-full shrink-0 flex flex-col bg-[#1F1F1F] font-mono">
                                        {/* Diff Lines Content */}
                                        <div className="overflow-x-auto chat-scrollbar py-0.5 bg-[#1F1F1F] w-full">
                                            <div className="min-w-full w-max flex flex-col">
                                                {file.lines.map((line, idx) => (
                                                    <DiffLineRenderer
                                                        key={idx}
                                                        line={line}
                                                        lineIdx={idx}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Right Side Files Explorer Sidebar: Dynamically built from actual fileDiffs */}
            <div className="w-56 border-l border-[#222225] bg-[#141414] flex flex-col h-full shrink-0">
                <div className="flex-1 overflow-y-auto chat-scrollbar p-2.5 space-y-0.5 select-none text-xs">
                    {dynamicTreeNodes.length === 0 ? (
                        <div className="py-4 text-center text-[#8E8D8C] text-[12px]">
                            No changes
                        </div>
                    ) : (
                        dynamicTreeNodes.map((child) => (
                            <TreeItem
                                key={child.path}
                                node={child}
                                selectedPath={selectedPath}
                                onSelectFile={handleSelectFileFromTree}
                                openFolders={openFolders}
                                onToggleFolder={toggleFolder}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
