import util from 'util'
export function parseErrorMessage(err: any): string {
    let errMsg = ''
    try {
        errMsg = err?.message || String(err)
        if (typeof errMsg !== 'string') {
            errMsg = JSON.stringify(errMsg)
        }
    } catch {
        return 'Unknown error occurred.'
    }

    const extractMessage = (str: string): string | null => {
        if (!str) return null

        // 1. try regex extraction first, since it's the most robust against broken json
        const msgMatch = str.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)
        if (msgMatch) {
            let extractedMatch = msgMatch[1]
            try {
                extractedMatch = JSON.parse(`"${msgMatch[1]}"`)
            } catch {
                // Keep raw match if unescape fails
            }

            if (typeof extractedMatch === 'string' && extractedMatch.trim().startsWith('{')) {
                const nested = extractMessage(extractedMatch)
                if (nested) return nested
            }
            return extractedMatch
        }

        // 2. try json parse
        try {
            const parsed = JSON.parse(str)
            if (parsed && typeof parsed === 'object') {
                // if the error field itself is a stringified json, recurse
                if (typeof parsed.error === 'string' && parsed.error.trim().startsWith('{')) {
                    const extracted = extractMessage(parsed.error)
                    if (extracted) return extracted
                }
                if (typeof parsed.message === 'string' && parsed.message.trim().startsWith('{')) {
                    const extracted = extractMessage(parsed.message)
                    if (extracted) return extracted
                }
                if (
                    typeof parsed.error?.message === 'string' &&
                    parsed.error.message.trim().startsWith('{')
                ) {
                    const extracted = extractMessage(parsed.error.message)
                    if (extracted) return extracted
                }

                // normal object access
                if (typeof parsed.error?.message === 'string') return parsed.error.message
                if (typeof parsed.message === 'string') return parsed.message
                if (typeof parsed.error === 'string') return parsed.error
            }
        } catch {
            // Ignore JSON parse error and continue to fallback extractors
        }

        // 3. try json block extraction
        const firstBrace = str.indexOf('{')
        const lastBrace = str.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonStr = str.slice(firstBrace, lastBrace + 1)
            try {
                const parsed = JSON.parse(jsonStr)
                if (parsed?.error?.message && typeof parsed.error.message === 'string')
                    return parsed.error.message
                if (parsed?.message && typeof parsed.message === 'string') return parsed.message
            } catch {
                // Ignore slice parse error
            }
        }

        return null
    }

    const extracted = extractMessage(errMsg)
    if (extracted && extracted !== '[object Object]') return extracted

    if (errMsg === '[object Object]' && err && typeof err === 'object') {
        try {
            const inspected = util.inspect(err)
            if (inspected && inspected !== '{}' && inspected !== '{ cause: {} }') {
                return inspected
            }
        } catch {
            // Fall back to raw string
        }
    }

    const result = errMsg.replace(/^\[.*?Error\]:\s*/, '').trim()
    if (
        result === '{\n  "cause": {}\n}' ||
        result === '{"cause":{}}' ||
        result === '{}' ||
        result === '{ cause: {} }'
    ) {
        return 'An unknown error occurred while communicating with the model provider.'
    }

    return result
}
