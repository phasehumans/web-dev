/**
 * Trims verbose markdown docstrings, examples, and non-essential fields from tool JSON schemas
 * to minimize context bloat and speed up LLM prefill TTFT.
 */
export function trimToolSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema

    if (Array.isArray(schema)) {
        return schema.map((item) => trimToolSchema(item))
    }

    const trimmed: Record<string, any> = {}

    for (const [key, value] of Object.entries(schema)) {
        // Strip non-essential verbose schema properties
        if (key === 'examples' || key === '$comment') {
            continue
        }

        if (key === 'description' && typeof value === 'string') {
            // Clean up markdown syntax and collapse multiple whitespace/newlines
            const cleaned = value
                .replace(/\*\*(.*?)\*\*/g, '$1') // Strip bold
                .replace(/\*(.*?)\*/g, '$1') // Strip italic
                .replace(/`(.*?)`/g, '$1') // Strip inline code backticks
                .replace(/\s+/g, ' ') // Collapse extra spaces/newlines
                .trim()

            trimmed[key] = cleaned
        } else if (typeof value === 'object' && value !== null) {
            trimmed[key] = trimToolSchema(value)
        } else {
            trimmed[key] = value
        }
    }

    return trimmed
}
