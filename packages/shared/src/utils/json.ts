export function safeParseJson(text: string): any {
    if (!text || text.trim() === '') {
        return {}
    }

    let cleanText = text.trim()

    // remove markdown code blocks if present
    if (cleanText.startsWith('```')) {
        const lines = cleanText.split('\n')
        // remove the first line (e.g. ```json)
        lines.shift()
        // remove the last line if it's just ```
        if (lines.length > 0 && lines[lines.length - 1]?.trim() === '```') {
            lines.pop()
        }
        cleanText = lines.join('\n').trim()
    }

    try {
        return JSON.parse(cleanText)
    } catch (err: any) {
        // attempt basic fixes for common llm hallucinations:
        // 1. missing closing brace
        if (cleanText.startsWith('{') && !cleanText.endsWith('}')) {
            try {
                return JSON.parse(cleanText + '}')
            } catch {
                // Intentionally swallowed: fallback handled
            }
        }
        // 2. extra trailing comma
        if (cleanText.endsWith(',}') || cleanText.endsWith(', }') || cleanText.match(/,\s*\}/)) {
            try {
                return JSON.parse(cleanText.replace(/,\s*\}/g, '}'))
            } catch {
                // Intentionally swallowed: fallback handled
            }
        }

        throw new Error(`Failed to parse JSON tool arguments: ${err.message}\nRaw text: ${text}`, {
            cause: err,
        })
    }
}
