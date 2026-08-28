import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ChevronDown } from 'lucide-react'
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs'
import React, { useState, useEffect, useRef } from 'react'

import { CliSpinner } from '@/features/chat/components/CliSpinner'
import { parseInlineThoughtBlocks } from '@/features/chat/utils/thoughtParser'
import { cn } from '@/shared/lib/utils'

let mermaidInitialized = false

const initMermaid = () => {
    if (typeof window === 'undefined' || mermaidInitialized) return
    try {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                darkMode: true,
                background: 'transparent',
                mainBkg: '#27272A',
                nodeBorder: '#52525B',
                nodeTextColor: '#EDEDEF',
                textColor: '#EDEDEF',
                lineColor: '#71717A',
                arrowheadColor: '#A1A1AA',
                primaryColor: '#27272A',
                primaryTextColor: '#EDEDEF',
                primaryBorderColor: '#52525B',
                secondaryColor: '#222226',
                secondaryTextColor: '#EDEDEF',
                secondaryBorderColor: '#52525B',
                tertiaryColor: '#1E1E22',
                tertiaryTextColor: '#D4D4D8',
                tertiaryBorderColor: '#3F3F46',

                // Sequence Diagram variables
                actorBkg: '#27272A',
                actorBorder: '#52525B',
                actorTextColor: '#EDEDEF',
                actorLineColor: '#52525B',
                signalColor: '#A1A1AA',
                signalTextColor: '#EDEDEF',
                labelBoxBkgColor: '#27272A',
                labelBoxBorderColor: '#52525B',
                labelTextColor: '#EDEDEF',
                loopTextColor: '#EDEDEF',
                noteBorderColor: '#52525B',
                noteBkgColor: '#222226',
                noteTextColor: '#EDEDEF',
                activationBorderColor: '#71717A',
                activationBkgColor: '#3F3F46',
                sequenceNumberColor: '#FFFFFF',

                fontFamily:
                    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
            },
            sequence: {
                diagramMarginX: 10,
                diagramMarginY: 10,
                actorMargin: 45,
                width: 150,
                height: 40,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35,
                mirrorActors: false,
                useMaxWidth: true,
            },
            securityLevel: 'loose',
        })
        mermaidInitialized = true
    } catch {
        // Intentionally swallowed: optional mermaid init fallback
    }
}

export const MermaidDiagram: React.FC<{ code: string }> = ({ code }) => {
    const [svg, setSvg] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let isMounted = true
        initMermaid()

        const renderDiagram = async () => {
            if (!code || !code.trim()) return
            try {
                const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                const result = await mermaid.render(uniqueId, code.trim())
                if (isMounted) {
                    setSvg(result.svg)
                    setError(null)
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err?.message || 'Failed to render diagram')
                }
            }
        }

        void renderDiagram()
        return () => {
            isMounted = false
        }
    }, [code])

    const handleCopy = () => {
        void navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="my-3.5 w-full max-w-full rounded-xl overflow-hidden bg-[#18181A] text-left relative group border-none shadow-none">
            {/* Minimal floating copy button */}
            <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 text-[11px] text-[#A09F9E] hover:text-white transition-all cursor-pointer py-1 px-2 rounded-md bg-[#242427]/80 hover:bg-[#2E2E32] opacity-0 group-hover:opacity-100 focus:opacity-100 backdrop-blur-sm"
                title="Copy diagram code"
            >
                {copied ? (
                    <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy size={12} />
                        <span>Copy</span>
                    </>
                )}
            </button>

            {/* Visual Diagram Display */}
            {svg && !error ? (
                <div
                    ref={containerRef}
                    className="p-4 sm:p-6 overflow-x-auto flex justify-center items-center bg-[#18181A] select-none [&_svg]:max-w-full [&_svg]:h-auto [&_svg_rect.actor]:fill-[#27272A] [&_svg_rect.actor]:stroke-[#52525B] [&_svg_line.actor-line]:stroke-[#52525B] [&_svg_text.actor]:fill-[#EDEDEF] [&_svg_.messageLine0]:stroke-[#71717A] [&_svg_.messageLine1]:stroke-[#71717A] [&_svg_.messageText]:fill-[#EDEDEF] [&_svg_rect.note]:fill-[#222226] [&_svg_rect.note]:stroke-[#52525B] [&_svg_.noteText]:fill-[#EDEDEF] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : error ? (
                <pre className="p-3.5 sm:p-4 pt-1 sm:pt-1.5 overflow-x-auto text-[12.5px] sm:text-[13px] font-mono text-[#E4E3E2] leading-relaxed select-text bg-[#18181A] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <code>{highlightCode(code)}</code>
                </pre>
            ) : null}
        </div>
    )
}

function tokenizeLine(line: string): React.ReactNode[] {
    if (!line) return ['\n']

    const tokenRegex =
        /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|<!--[\s\S]*?-->|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|async|await|try|catch|finally|throw|new|this|typeof|instanceof|interface|type|enum|public|private|protected|readonly|def|self|lambda|pass|yield|elif|None|True|False|nil|func|struct|package|select|where|insert|update|delete|join|create|table|null|true|false|undefined)\b|\b(?:string|number|boolean|any|void|Promise|Array|Record|Map|Set|Object|React|FC|useState|useEffect|useCallback|useMemo|useRef)\b|\b\d+(?:\.\d+)?\b|<\/?[a-zA-Z0-9_-]+|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g

    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(line.slice(lastIndex, match.index))
        }

        const token = match[0]
        if (
            token.startsWith('//') ||
            token.startsWith('/*') ||
            token.startsWith('#') ||
            token.startsWith('<!--')
        ) {
            nodes.push(
                <span key={match.index} className="text-[#71717A] italic">
                    {token}
                </span>
            )
        } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
            nodes.push(
                <span key={match.index} className="text-[#86EFAC]">
                    {token}
                </span>
            )
        } else if (/^\d+(?:\.\d+)?$/.test(token)) {
            nodes.push(
                <span key={match.index} className="text-[#FDBA74]">
                    {token}
                </span>
            )
        } else if (
            /^(?:const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|async|await|try|catch|finally|throw|new|this|typeof|instanceof|interface|type|enum|public|private|protected|readonly|def|self|lambda|pass|yield|elif|nil|func|struct|package|select|where|insert|update|delete|join|create|table)$/.test(
                token
            )
        ) {
            nodes.push(
                <span key={match.index} className="text-[#C084FC] font-medium">
                    {token}
                </span>
            )
        } else if (/^(?:null|true|false|undefined|None|True|False)$/.test(token)) {
            nodes.push(
                <span key={match.index} className="text-[#FDBA74] font-medium">
                    {token}
                </span>
            )
        } else if (
            /^(?:string|number|boolean|any|void|Promise|Array|Record|Map|Set|Object|React|FC|useState|useEffect|useCallback|useMemo|useRef)$/.test(
                token
            )
        ) {
            nodes.push(
                <span key={match.index} className="text-[#67E8F9]">
                    {token}
                </span>
            )
        } else if (token.startsWith('<')) {
            nodes.push(
                <span key={match.index} className="text-[#F472B6]">
                    {token}
                </span>
            )
        } else {
            nodes.push(
                <span key={match.index} className="text-[#60A5FA]">
                    {token}
                </span>
            )
        }

        lastIndex = match.index + token.length
    }

    if (lastIndex < line.length) {
        nodes.push(line.slice(lastIndex))
    }

    return nodes.length > 0 ? nodes : [line]
}

function highlightCode(code: string): React.ReactNode[] {
    const lines = code.split('\n')
    return lines.map((line, lineIdx) => (
        <div key={lineIdx} className="leading-relaxed">
            {tokenizeLine(line)}
        </div>
    ))
}

interface SearchCodeBlockProps {
    language?: string
    code: string
}

export const SearchCodeBlock: React.FC<SearchCodeBlockProps> = ({ language = 'code', code }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        void navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="my-4 sm:my-3.5 w-full max-w-full rounded-xl overflow-hidden bg-[#18181A] text-left border-none">
            <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-[#18181A] text-xs text-[#9E9D9C]">
                <span className="font-mono text-[11px] lowercase text-[#C4C3C2]">{language}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[11px] text-[#A09F9E] hover:text-white transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-white/5"
                >
                    {copied ? (
                        <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 sm:p-3.5 sm:pt-1.5 pt-1.5 overflow-x-auto text-[13px] sm:text-[13px] font-mono text-[#E4E3E2] leading-relaxed select-text bg-[#18181A] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                <code>{highlightCode(code)}</code>
            </pre>
        </div>
    )
}

export const SearchStreamingCursor: React.FC<{ className?: string }> = ({ className }) => (
    <span
        className={cn(
            'inline-block w-[4px] h-[14px] bg-[#EDEDEF] rounded-[1px] ml-1 align-baseline animate-pulse select-none opacity-85',
            className
        )}
        aria-hidden="true"
    />
)

export const SearchThinkingLoader: React.FC<{ label?: string }> = ({ label = 'Thinking...' }) => (
    <div className="py-1 flex items-center select-none font-sans">
        <CliSpinner label={label} spinnerColor="text-[#8E8D8C]" labelColor="text-[#8E8D8C]" />
    </div>
)

interface SearchThoughtsProps {
    content: string
    isStreaming?: boolean
}

export const SearchThoughtsAccordion: React.FC<SearchThoughtsProps> = ({
    content,
    isStreaming = false,
}) => {
    const [userToggled, setUserToggled] = useState<boolean | null>(null)
    const expanded = userToggled !== null ? userToggled : isStreaming

    if (!content && !isStreaming) return null

    return (
        <div className="space-y-1 my-1 font-sans">
            <button
                type="button"
                onClick={() => setUserToggled(!expanded)}
                className="flex items-center gap-1.5 text-[11.5px] text-[#8E8D8C] hover:text-[#C4C3C2] transition-colors cursor-pointer select-none italic py-1 -my-0.5 touch-manipulation"
            >
                <ChevronDown
                    size={12}
                    className={cn(
                        'transition-transform duration-200 not-italic',
                        expanded ? 'rotate-0' : '-rotate-90'
                    )}
                />
                <span>Thoughts</span>
                {isStreaming && (
                    <CliSpinner label="" className="ml-0.5" spinnerColor="text-[#8E8D8C]" />
                )}
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
                        <div className="text-[12.5px] leading-relaxed text-[#8E8D8C] font-sans select-text py-0.5 space-y-2 pl-3.5 border-l-2 border-[#2C2C30]">
                            {renderMarkdownBlocks(content, true, isStreaming)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const replaceMathSymbols = (str: string): string => {
    return str
        .replace(/\$(?:\\rightarrow|\\to)\$|\\rightarrow/g, '→')
        .replace(/\$\\leftarrow\$|\\leftarrow/g, '←')
        .replace(/\$\\leftrightarrow\$|\\leftrightarrow/g, '↔')
        .replace(/\$\\Rightarrow\$|\\Rightarrow/g, '⇒')
        .replace(/\$\\Leftarrow\$|\\Leftarrow/g, '⇐')
        .replace(/\$\\Leftrightarrow\$|\\Leftrightarrow/g, '⇔')
        .replace(/\$\\le\$|\\le\b/g, '≤')
        .replace(/\$\\ge\$|\\ge\b/g, '≥')
        .replace(/\$\\ne\$|\\ne\b/g, '≠')
        .replace(/\$\\approx\$|\\approx\b/g, '≈')
        .replace(/\$\\pm\$|\\pm\b/g, '±')
        .replace(/\$\\times\$|\\times\b/g, '×')
}

interface SearchTableProps {
    headers: string[]
    alignments: ('left' | 'center' | 'right')[]
    rows: string[][]
    isThoughts?: boolean
}

export const SearchTable: React.FC<SearchTableProps> = ({
    headers,
    alignments,
    rows,
    isThoughts = false,
}) => {
    return (
        <div className="my-4 sm:my-3.5 w-full max-w-full overflow-x-auto rounded-xl bg-[#18181A] border-none shadow-none [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full border-collapse text-left font-sans text-[13.5px] sm:text-[13.5px] leading-normal">
                <thead>
                    <tr className="border-b border-white/[0.06] bg-transparent">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className={cn(
                                    'px-4 py-3 sm:px-4 sm:py-2.5 font-medium text-[#A1A1AA] text-[12px] uppercase tracking-wider select-text',
                                    alignments[i] === 'center'
                                        ? 'text-center'
                                        : alignments[i] === 'right'
                                          ? 'text-right'
                                          : 'text-left'
                                )}
                            >
                                {parseInlineMarkdown(h, isThoughts)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="transition-colors hover:bg-white/[0.015]">
                            {headers.map((_, colIdx) => {
                                const cellValue = row[colIdx] || ''
                                const align = alignments[colIdx] || 'left'
                                return (
                                    <td
                                        key={colIdx}
                                        className={cn(
                                            'px-4 py-3 sm:px-4 sm:py-2.5 text-[#E4E4E7] select-text break-words align-top leading-relaxed',
                                            align === 'center'
                                                ? 'text-center'
                                                : align === 'right'
                                                  ? 'text-right'
                                                  : 'text-left'
                                        )}
                                    >
                                        {parseInlineMarkdown(cellValue, isThoughts)}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const parseRowCells = (line: string): string[] => {
    const trimmed = line.trim()
    const stripped = trimmed.replace(/^\|/, '').replace(/\|$/, '')
    return stripped.split('|').map((cell) => cell.trim())
}

const isSeparatorRow = (line: string): boolean => {
    const trimmed = line.trim()
    if (!trimmed.includes('|') || !trimmed.includes('-')) return false
    const cells = parseRowCells(trimmed)
    return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c))
}

const isTableLine = (line: string): boolean => {
    const trimmed = line.trim()
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2
}

const getAlignments = (separatorLine: string): ('left' | 'center' | 'right')[] => {
    const cells = parseRowCells(separatorLine)
    return cells.map((cell) => {
        const starts = cell.startsWith(':')
        const ends = cell.endsWith(':')
        if (starts && ends) return 'center'
        if (ends) return 'right'
        return 'left'
    })
}

const parseInlineMarkdown = (rawText: string, isThoughts = false): React.ReactNode[] => {
    const text = replaceMathSymbols(rawText)
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~|https?:\/\/[^\s]+)/g
    const matches = text.split(regex)

    return matches.map((part, idx) => {
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
        if (linkMatch) {
            return (
                <a
                    key={idx}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#87B2F4] hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                    {linkMatch[1]}
                </a>
            )
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
            return (
                <a
                    key={idx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#87B2F4] hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                    {part}
                </a>
            )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong
                    key={idx}
                    className={cn('font-semibold', isThoughts ? 'text-[#C4C3C2]' : 'text-white')}
                >
                    {part.slice(2, -2)}
                </strong>
            )
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return (
                <em
                    key={idx}
                    className={cn('italic', isThoughts ? 'text-[#A09F9E]' : 'text-[#C4C3C2]')}
                >
                    {part.slice(1, -1)}
                </em>
            )
        }
        if (part.startsWith('~~') && part.endsWith('~~')) {
            return (
                <del key={idx} className="line-through text-[#8E8D8C]">
                    {part.slice(2, -2)}
                </del>
            )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code
                    key={idx}
                    className="px-1.5 py-[2px] rounded bg-[#222225] font-mono text-[12px] text-[#EDEDEF] border border-[#303034]"
                >
                    {part.slice(1, -1)}
                </code>
            )
        }
        return part
    })
}

export const renderMarkdownBlocks = (
    text: string,
    isThoughts = false,
    showCursor = false
): React.ReactNode => {
    if (!text) {
        if (showCursor) {
            return (
                <SearchStreamingCursor
                    className={isThoughts ? 'h-[12px] w-[5px] bg-[#87B2F4]' : undefined}
                />
            )
        }
        return null
    }

    // Split text into code blocks and normal markdown text
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const precedingText = text.slice(lastIndex, match.index)
        if (precedingText) {
            elements.push(
                <React.Fragment key={`text-${lastIndex}`}>
                    {renderTextContent(precedingText, isThoughts, false)}
                </React.Fragment>
            )
        }

        const language = (match[1] || 'code').toLowerCase().trim()
        const codeContent = match[2]
        if (language === 'mermaid') {
            elements.push(
                <MermaidDiagram
                    key={`mermaid-${match.index}`}
                    code={codeContent.replace(/\n$/, '')}
                />
            )
        } else {
            elements.push(
                <SearchCodeBlock
                    key={`code-${match.index}`}
                    language={language}
                    code={codeContent.replace(/\n$/, '')}
                />
            )
        }

        lastIndex = match.index + match[0].length
    }

    const remainingText = text.slice(lastIndex)
    if (remainingText || showCursor) {
        elements.push(
            <React.Fragment key={`text-${lastIndex}`}>
                {renderTextContent(remainingText, isThoughts, showCursor)}
            </React.Fragment>
        )
    }

    return <div className="space-y-3 sm:space-y-2 w-full">{elements}</div>
}

const renderTextContent = (
    text: string,
    isThoughts = false,
    showCursor = false
): React.ReactNode => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentListItems: React.ReactNode[] = []
    let currentListType: 'ul' | 'ol' | null = null

    const flushList = (key: string | number) => {
        if (currentListItems.length > 0) {
            if (currentListType === 'ol') {
                elements.push(
                    <ol
                        key={`ol-${key}`}
                        className={cn(
                            'my-2.5 sm:my-2 space-y-1.5 sm:space-y-1 pl-4 list-decimal leading-relaxed',
                            isThoughts
                                ? 'text-[12.5px] text-[#8E8D8C]'
                                : 'text-[14.5px] sm:text-[13.5px] text-[#D6D5D4]'
                        )}
                    >
                        {...currentListItems}
                    </ol>
                )
            } else {
                elements.push(
                    <ul
                        key={`ul-${key}`}
                        className="my-2.5 sm:my-2 space-y-2 sm:space-y-1.5 pl-0.5 w-full"
                    >
                        {...currentListItems}
                    </ul>
                )
            }
            currentListItems = []
            currentListType = null
        }
    }

    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()

        if (!trimmed) {
            flushList(i)
            i++
            continue
        }

        // Check if this is the start of a markdown table (header row)
        if (isTableLine(trimmed)) {
            let nextIdx = i + 1
            while (nextIdx < lines.length && !lines[nextIdx].trim()) {
                nextIdx++
            }

            if (nextIdx < lines.length && isSeparatorRow(lines[nextIdx])) {
                flushList(i)
                const headers = parseRowCells(trimmed)
                const alignments = getAlignments(lines[nextIdx])
                const tableRows: string[][] = []

                let rowIdx = nextIdx + 1
                while (rowIdx < lines.length) {
                    const rowLine = lines[rowIdx].trim()
                    if (!rowLine) {
                        // Check if next non-empty line is still a table row
                        let peek = rowIdx + 1
                        while (peek < lines.length && !lines[peek].trim()) {
                            peek++
                        }
                        if (
                            peek < lines.length &&
                            isTableLine(lines[peek]) &&
                            !isSeparatorRow(lines[peek])
                        ) {
                            rowIdx = peek
                            continue
                        } else {
                            break
                        }
                    }

                    if (isTableLine(rowLine) && !isSeparatorRow(rowLine)) {
                        tableRows.push(parseRowCells(rowLine))
                        rowIdx++
                    } else {
                        break
                    }
                }

                elements.push(
                    <SearchTable
                        key={`table-${i}`}
                        headers={headers}
                        alignments={alignments}
                        rows={tableRows}
                        isThoughts={isThoughts}
                    />
                )

                i = rowIdx
                continue
            }
        }

        // Filter out horizontal rules / separator lines like ---, ***, ___, -----
        if (
            /^[-*_]{3,}$/.test(trimmed) ||
            trimmed === '---' ||
            trimmed === '***' ||
            trimmed === '___'
        ) {
            flushList(i)
            i++
            continue
        }

        if (trimmed.startsWith('### ')) {
            flushList(i)
            elements.push(
                <h3
                    key={i}
                    className="text-[15.5px] sm:text-[15px] font-medium text-white tracking-tight mt-4.5 sm:mt-4 mb-2 sm:mb-1.5 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(4), isThoughts)}
                </h3>
            )
        } else if (trimmed.startsWith('#### ')) {
            flushList(i)
            elements.push(
                <h4
                    key={i}
                    className="text-[14.5px] sm:text-[14px] font-medium text-white mt-3.5 sm:mt-3 mb-1.5 sm:mb-1 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(5), isThoughts)}
                </h4>
            )
        } else if (trimmed.startsWith('## ')) {
            flushList(i)
            elements.push(
                <h2
                    key={i}
                    className="text-[17px] sm:text-[16.5px] font-medium text-white tracking-tight mt-5 sm:mt-4.5 mb-2 sm:mb-2 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(3), isThoughts)}
                </h2>
            )
        } else if (trimmed.startsWith('# ')) {
            flushList(i)
            elements.push(
                <h1
                    key={i}
                    className="text-[19px] sm:text-[18px] font-medium text-white tracking-tight mt-6 sm:mt-5 mb-2.5 sm:mb-2.5 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(2), isThoughts)}
                </h1>
            )
        } else if (trimmed.startsWith('> ')) {
            flushList(i)
            elements.push(
                <blockquote
                    key={i}
                    className="border-l-2 border-[#52525B] pl-3.5 py-1.5 sm:py-1 my-3 sm:my-2.5 text-[14px] sm:text-[13.5px] italic text-[#A1A1AA] bg-transparent"
                >
                    {parseInlineMarkdown(trimmed.slice(2), isThoughts)}
                </blockquote>
            )
        } else if (
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ') ||
            trimmed.startsWith('• ')
        ) {
            if (currentListType !== 'ul') {
                flushList(i)
                currentListType = 'ul'
            }
            const itemContent = trimmed.replace(/^[-*•]\s+/, '')
            currentListItems.push(
                <li
                    key={`li-${i}`}
                    className={cn(
                        'flex items-start gap-2.5 sm:gap-2 leading-[1.7] w-full',
                        isThoughts
                            ? 'text-[12.5px] text-[#8E8D8C]'
                            : 'text-[14.5px] sm:text-[14px] text-[#E3E2E0]'
                    )}
                >
                    <span className="mt-[9.5px] sm:mt-[8.5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#71717A]" />
                    <span className="select-text w-full break-words">
                        {parseInlineMarkdown(itemContent, isThoughts)}
                    </span>
                </li>
            )
        } else if (/^\d+\.\s+/.test(trimmed)) {
            if (currentListType !== 'ol') {
                flushList(i)
                currentListType = 'ol'
            }
            const itemContent = trimmed.replace(/^\d+\.\s+/, '')
            currentListItems.push(
                <li
                    key={`ol-li-${i}`}
                    className={cn(
                        'select-text break-words leading-[1.7]',
                        isThoughts
                            ? 'text-[12.5px] text-[#8E8D8C]'
                            : 'text-[14.5px] sm:text-[14px] text-[#E3E2E0]'
                    )}
                >
                    {parseInlineMarkdown(itemContent, isThoughts)}
                </li>
            )
        } else {
            flushList(i)
            elements.push(
                <p
                    key={i}
                    className={cn(
                        'leading-[1.7] select-text whitespace-pre-wrap',
                        isThoughts
                            ? 'text-[12.5px] text-[#8E8D8C] my-1'
                            : 'text-[14.5px] sm:text-[14px] text-[#E3E2E0] my-2.5 sm:my-2'
                    )}
                >
                    {parseInlineMarkdown(line, isThoughts)}
                </p>
            )
        }

        i++
    }

    flushList('final')
    return (
        <div className="space-y-1 w-full">
            {elements}
            {showCursor && (
                <SearchStreamingCursor
                    className={isThoughts ? 'h-[12px] w-[5px] bg-[#87B2F4]' : undefined}
                />
            )}
        </div>
    )
}

export const SearchMarkdown: React.FC<{
    content: string
    thoughts?: string
    isStreaming?: boolean
    isThinking?: boolean
}> = ({ content, thoughts, isStreaming = false, isThinking = false }) => {
    const hasThoughts = Boolean(thoughts && thoughts.trim().length > 0)
    const isThinkingNow = isThinking || (isStreaming && !content)

    const segments = parseInlineThoughtBlocks(content, isStreaming && !hasThoughts)
    const hasThoughtSegment = segments.some((s) => s.type === 'thought')
    const hasAnyContent = Boolean(content && content.trim().length > 0)

    return (
        <div className="space-y-2 w-full text-left font-sans select-text">
            {/* Thinking indicator when awaiting response or starting up */}
            {isStreaming && !hasAnyContent && !hasThoughts && !hasThoughtSegment && (
                <SearchThinkingLoader />
            )}

            {hasThoughts && (
                <SearchThoughtsAccordion
                    content={thoughts!}
                    isStreaming={isThinkingNow && !hasThoughtSegment}
                />
            )}

            {segments.map((seg, idx) => {
                if (seg.type === 'thought') {
                    return (
                        <SearchThoughtsAccordion
                            key={idx}
                            content={seg.content}
                            isStreaming={seg.isStreaming}
                        />
                    )
                }
                const isLastSegment = idx === segments.length - 1
                const showCursor = isStreaming && isLastSegment && !isThinkingNow
                return (
                    <React.Fragment key={idx}>
                        {renderMarkdownBlocks(seg.content, false, showCursor)}
                    </React.Fragment>
                )
            })}
        </div>
    )
}
