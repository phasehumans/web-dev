import React from 'react'

export const parseInlineFormatting = (text: string): React.ReactNode[] => {
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g
    const matches = text.split(regex)

    return matches.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={idx} className="font-semibold text-[#E6E4E3]">
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
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code
                    key={idx}
                    className="px-1 py-0.5 rounded bg-white/5 font-mono text-[10.5px] text-[#E6E4E3]"
                >
                    {part.slice(1, -1)}
                </code>
            )
        }
        return part
    })
}

export const renderRichContent = (text: string, isThoughts = false) => {
    if (!text) return null

    const lines = text.split('\n').map((l) => l.trim())
    const elements: React.ReactNode[] = []
    let currentListItems: React.ReactNode[] = []

    const flushList = (key: string | number) => {
        if (currentListItems.length > 0) {
            elements.push(
                <ul key={`ul-${key}`} className="my-1.5 space-y-1.5 pl-0.5 w-full">
                    {...currentListItems}
                </ul>
            )
            currentListItems = []
        }
    }

    lines.forEach((line, index) => {
        if (!line || line.trim().toLowerCase() === '### overview') {
            flushList(index)
            return
        }

        if (line.startsWith('### ')) {
            flushList(index)
            elements.push(
                <h3
                    key={index}
                    className="text-[12px] font-bold text-[#E6E4E3] tracking-wide mt-3 mb-1 font-sans"
                >
                    {parseInlineFormatting(line.slice(4))}
                </h3>
            )
        } else if (line.startsWith('#### ')) {
            flushList(index)
            elements.push(
                <h4
                    key={index}
                    className="text-[11.5px] font-semibold text-[#E6E4E3] mt-2 mb-1 font-sans"
                >
                    {parseInlineFormatting(line.slice(5))}
                </h4>
            )
        } else if (line.startsWith('## ')) {
            flushList(index)
            elements.push(
                <h2
                    key={index}
                    className="text-[13px] font-bold text-[#E6E4E3] tracking-wide mt-4 mb-1.5 font-sans"
                >
                    {parseInlineFormatting(line.slice(3))}
                </h2>
            )
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
            currentListItems.push(
                <li
                    key={`li-${index}`}
                    className="flex items-start gap-2 text-[12px] leading-5 text-[#B7B6B5] w-full"
                >
                    <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#6D6C6B]" />
                    <span className="select-text w-full break-words">
                        {parseInlineFormatting(line.slice(2))}
                    </span>
                </li>
            )
        } else {
            flushList(index)
            const processedLine = line.replace(
                /^(\*\*Overview:\*\*|\*\*Overview\*\*|Overview:?)\s*[-–—]?\s*/i,
                ''
            )
            elements.push(
                <p
                    key={index}
                    className={
                        isThoughts
                            ? 'text-[12px] leading-relaxed text-[#8E8D8C] whitespace-pre-wrap select-text mb-1.5'
                            : 'text-[12.5px] leading-relaxed text-[#D1D0CF] whitespace-pre-wrap select-text mb-2'
                    }
                >
                    {parseInlineFormatting(processedLine)}
                </p>
            )
        }
    })

    flushList('final')
    return <div className="space-y-1.5 w-full">{elements}</div>
}
