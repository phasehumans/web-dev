import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

import { parseInlineThoughtBlocks } from '@/features/chat/utils/thoughtParser'
import { cn } from '@/shared/lib/utils'

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
        <div className="my-3 rounded-xl overflow-hidden border border-[#2B2A29] bg-[#18181A] text-left">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#202022] border-b border-[#2B2A29] text-xs text-[#9E9D9C]">
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
            <pre className="p-3.5 overflow-x-auto text-[13px] font-mono text-[#E4E3E2] leading-relaxed select-text">
                <code>{code}</code>
            </pre>
        </div>
    )
}

interface SearchThoughtsProps {
    content: string
    isStreaming?: boolean
}

export const SearchThoughtsAccordion: React.FC<SearchThoughtsProps> = ({
    content,
    isStreaming = false,
}) => {
    const [expanded, setExpanded] = useState(false)

    if (isStreaming) {
        return (
            <div className="my-2 p-2.5 rounded-lg bg-[#1C1C1E]/80 border border-[#2B2A29] text-xs text-[#9E9D9C] font-mono leading-relaxed select-text animate-pulse">
                <span className="text-[#87B2F4] mr-2">✦ Reasoning</span>
                {content}
            </div>
        )
    }

    return (
        <div className="my-2 rounded-lg border border-[#282726] bg-[#181819] overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-[#9E9D9C] hover:text-[#D4D3D2] hover:bg-white/5 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-1.5 font-medium">
                    <ChevronDown
                        size={13}
                        className={cn(
                            'transition-transform duration-200 text-[#8E8D8C]',
                            expanded ? 'rotate-0' : '-rotate-90'
                        )}
                    />
                    <span>Thoughts & Reasoning</span>
                </div>
                <span className="text-[11px] text-[#6E6D6C] font-mono">
                    {content.split(/\s+/).filter(Boolean).length} words
                </span>
            </button>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-[#262524]"
                    >
                        <div className="p-3 text-[12.5px] leading-relaxed text-[#9E9D9C] font-sans whitespace-pre-wrap select-text">
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
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
                <strong key={idx} className="font-semibold text-white">
                    {part.slice(2, -2)}
                </strong>
            )
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return (
                <em key={idx} className="italic text-[#C4C3C2]">
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
                    className="px-1.5 py-[2px] rounded bg-[#222225] font-mono text-[12px] text-[#EDEDED] border border-[#303034]"
                >
                    {part.slice(1, -1)}
                </code>
            )
        }
        return part
    })
}

export const renderMarkdownBlocks = (text: string): React.ReactNode => {
    if (!text) return null

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
                    {renderTextContent(precedingText)}
                </React.Fragment>
            )
        }

        const language = match[1] || 'code'
        const codeContent = match[2]
        elements.push(
            <SearchCodeBlock
                key={`code-${match.index}`}
                language={language}
                code={codeContent.replace(/\n$/, '')}
            />
        )

        lastIndex = match.index + match[0].length
    }

    const remainingText = text.slice(lastIndex)
    if (remainingText) {
        elements.push(
            <React.Fragment key={`text-${lastIndex}`}>
                {renderTextContent(remainingText)}
            </React.Fragment>
        )
    }

    return <div className="space-y-2 w-full">{elements}</div>
}

const renderTextContent = (text: string): React.ReactNode => {
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
                        className="my-2 space-y-1 pl-4 list-decimal text-[13.5px] leading-relaxed text-[#D6D5D4]"
                    >
                        {...currentListItems}
                    </ol>
                )
            } else {
                elements.push(
                    <ul key={`ul-${key}`} className="my-2 space-y-1.5 pl-0.5 w-full">
                        {...currentListItems}
                    </ul>
                )
            }
            currentListItems = []
            currentListType = null
        }
    }

    lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) {
            flushList(index)
            return
        }

        if (trimmed.startsWith('### ')) {
            flushList(index)
            elements.push(
                <h3
                    key={index}
                    className="text-[14.5px] font-semibold text-white tracking-tight mt-3 mb-1 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(4))}
                </h3>
            )
        } else if (trimmed.startsWith('#### ')) {
            flushList(index)
            elements.push(
                <h4
                    key={index}
                    className="text-[13.5px] font-semibold text-white mt-2.5 mb-1 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(5))}
                </h4>
            )
        } else if (trimmed.startsWith('## ')) {
            flushList(index)
            elements.push(
                <h2
                    key={index}
                    className="text-[16px] font-semibold text-white tracking-tight mt-4 mb-1.5 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(3))}
                </h2>
            )
        } else if (trimmed.startsWith('# ')) {
            flushList(index)
            elements.push(
                <h1
                    key={index}
                    className="text-[18px] font-bold text-white tracking-tight mt-4 mb-2 font-sans"
                >
                    {parseInlineMarkdown(trimmed.slice(2))}
                </h1>
            )
        } else if (trimmed.startsWith('> ')) {
            flushList(index)
            elements.push(
                <blockquote
                    key={index}
                    className="border-l-2 border-[#87B2F4] pl-3 py-1 my-2 text-[13px] italic text-[#B0AFAD] bg-white/[0.02] rounded-r-md"
                >
                    {parseInlineMarkdown(trimmed.slice(2))}
                </blockquote>
            )
        } else if (
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ') ||
            trimmed.startsWith('• ')
        ) {
            if (currentListType !== 'ul') {
                flushList(index)
                currentListType = 'ul'
            }
            const itemContent = trimmed.replace(/^[-*•]\s+/, '')
            currentListItems.push(
                <li
                    key={`li-${index}`}
                    className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#D6D5D4] w-full"
                >
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#87B2F4]" />
                    <span className="select-text w-full break-words">
                        {parseInlineMarkdown(itemContent)}
                    </span>
                </li>
            )
        } else if (/^\d+\.\s+/.test(trimmed)) {
            if (currentListType !== 'ol') {
                flushList(index)
                currentListType = 'ol'
            }
            const itemContent = trimmed.replace(/^\d+\.\s+/, '')
            currentListItems.push(
                <li key={`ol-li-${index}`} className="select-text break-words">
                    {parseInlineMarkdown(itemContent)}
                </li>
            )
        } else {
            flushList(index)
            elements.push(
                <p
                    key={index}
                    className="text-[13.5px] leading-relaxed text-[#EDEDEF] select-text my-1.5 whitespace-pre-wrap"
                >
                    {parseInlineMarkdown(line)}
                </p>
            )
        }
    })

    flushList('final')
    return <div className="space-y-1 w-full">{elements}</div>
}

export const SearchMarkdown: React.FC<{ content: string; isStreaming?: boolean }> = ({
    content,
    isStreaming = false,
}) => {
    if (!content) return null

    const segments = parseInlineThoughtBlocks(content, isStreaming)

    return (
        <div className="space-y-2 w-full text-left font-sans select-text">
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
                return (
                    <React.Fragment key={idx}>{renderMarkdownBlocks(seg.content)}</React.Fragment>
                )
            })}
        </div>
    )
}
