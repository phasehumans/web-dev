/**
 * Utility for robustly extracting JSON arrays from LLM output.
 * Handles markdown codeblocks, preambles/postambles, and raw text formatting.
 */
export function extractJsonArray(rawText: string): any[] {
    const trimmed = rawText.trim()

    // 1. Direct JSON parse
    try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
            return parsed
        }
    } catch {
        // Continue to fallback strategies
    }

    // 2. Extract content from ```json ... ``` or ``` ... ``` codeblocks
    const codeblockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (codeblockMatch && codeblockMatch[1]) {
        try {
            const parsed = JSON.parse(codeblockMatch[1].trim())
            if (Array.isArray(parsed)) {
                return parsed
            }
        } catch {
            // Continue to fallback strategies
        }
    }

    // 3. Fallback bracket matching for JSON arrays [...]
    const arrayBracketMatch = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (arrayBracketMatch) {
        try {
            const parsed = JSON.parse(arrayBracketMatch[0])
            if (Array.isArray(parsed)) {
                return parsed
            }
        } catch {
            // Intentionally swallowed: fallback failed
        }
    }

    throw new Error('Failed to extract a valid JSON array from model output.')
}
