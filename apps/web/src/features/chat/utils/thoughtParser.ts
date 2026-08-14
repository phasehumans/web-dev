export type ThoughtSegment =
    | {
          type: 'thought'
          content: string
          tokenCount: number
          isStreaming?: boolean
      }
    | {
          type: 'text'
          content: string
      }

export function calculateThoughtTokens(content: string): number {
    const trimmed = content.trim()
    if (!trimmed) return 0
    const words = trimmed.split(/\s+/).length
    return Math.max(1, Math.round(words * 1.33))
}

export function parseInlineThoughtBlocks(text: string, isStreaming = false): ThoughtSegment[] {
    if (!text) return []

    // split by <thought> tags (case-insensitive, optional attributes)
    const parts = text.split(
        /(<thought(?:>| [^>]*>)[\s\S]*?<\/thought>|<thought(?:>| [^>]*>)[\s\S]*)/i
    )

    const segments: ThoughtSegment[] = []

    parts.forEach((part, index) => {
        if (!part) return

        if (/^<thought(?:>| [^>]*>)/i.test(part)) {
            const isClosed = /<\/thought>$/i.test(part)
            const isLastPart = index === parts.length - 1
            const isPartStreaming = !isClosed && (isStreaming || isLastPart)

            const thoughtContent = part
                .replace(/^<thought(?:>| [^>]*>)/i, '')
                .replace(/<\/thought>$/i, '')
                .trim()

            if (thoughtContent || isPartStreaming) {
                segments.push({
                    type: 'thought',
                    content: thoughtContent,
                    tokenCount: calculateThoughtTokens(thoughtContent),
                    isStreaming: isPartStreaming,
                })
            }
        } else if (part.trim().length > 0) {
            segments.push({
                type: 'text',
                content: part,
            })
        }
    })

    if (segments.length === 0 && text.trim().length > 0) {
        return [{ type: 'text', content: text }]
    }

    return segments
}
