import type { AgentMessage, Message } from '@december/shared'

/**
 * Deterministically evaporates bulky tool results older than recent turns into 1-line tombstones,
 * preserving 100% of user prompts and assistant thoughts/reasoning while saving context window space.
 */
export function evaporateStaleToolOutputs(
    messages: (AgentMessage | Message)[],
    preserveRecentTurns: number = 3
): Message[] {
    if (!messages || messages.length === 0) return []

    // 1. Calculate cutoff index based on recent user turns
    let userTurnsSeen = 0
    let cutoffIndex = 0

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role === 'user' && !(msg as AgentMessage).isUI) {
            userTurnsSeen++
            if (userTurnsSeen >= preserveRecentTurns) {
                cutoffIndex = i
                break
            }
        }
    }

    // If total user turns is less than preserveRecentTurns, no tool outputs are stale
    if (userTurnsSeen < preserveRecentTurns || cutoffIndex <= 0) {
        return messages.map((m) => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls,
            toolCallId: m.toolCallId,
        }))
    }

    return messages.map((msg, idx) => {
        const baseMsg: Message = {
            role: msg.role,
            content: msg.content,
            toolCalls: msg.toolCalls,
            toolCallId: msg.toolCallId,
        }

        // Keep recent turns intact
        if (idx >= cutoffIndex) {
            return baseMsg
        }

        // Only evaporate stale tool outputs
        if (msg.role === 'tool') {
            const rawContent = typeof msg.content === 'string' ? msg.content : ''
            if (rawContent.length < 200) {
                return baseMsg // Keep tiny tool results untouched
            }

            // If it contains an error or failure, preserve full diagnostic text
            if (
                rawContent.includes('[Tool Error]') ||
                rawContent.toLowerCase().includes('error:') ||
                rawContent.toLowerCase().includes('command failed')
            ) {
                return baseMsg
            }

            const lines = rawContent.split('\n')
            const lineCount = lines.length
            const byteSize = (Buffer.byteLength(rawContent, 'utf8') / 1024).toFixed(1)

            const tombstone = `[Tool Output Evaporated: ${lineCount} lines (${byteSize} KB). Content previously processed by assistant.]`
            return {
                ...baseMsg,
                content: tombstone,
            }
        }

        return baseMsg
    })
}
