import util from 'util'
export function parseErrorMessage(err: any): string {
    let errMsg: string
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
    let finalResult = extracted && extracted !== '[object Object]' ? extracted : ''

    if (!finalResult) {
        if (errMsg === '[object Object]' && err && typeof err === 'object') {
            try {
                const inspected = util.inspect(err)
                if (inspected && inspected !== '{}' && inspected !== '{ cause: {} }') {
                    finalResult = inspected
                }
            } catch {
                // Fall back to raw string
            }
        }
    }

    if (!finalResult) {
        const cleaned = errMsg.replace(/^\[.*?Error\]:\s*/, '').trim()
        if (
            cleaned === '{\n  "cause": {}\n}' ||
            cleaned === '{"cause":{}}' ||
            cleaned === '{}' ||
            cleaned === '{ cause: {} }'
        ) {
            finalResult = 'An unknown error occurred while communicating with the model provider.'
        } else {
            finalResult = cleaned
        }
    }

    const rateLimitNotice =
        'Rate limit or quota exhausted from LLM provider. Please upgrade your API key tier with your provider (OpenAI, Anthropic, Gemini) or switch to December Cloud Subscription at https://trydecember.com/pricing\n'

    const lowerStr = (errMsg + ' ' + (finalResult || '')).toLowerCase()
    const isRateLimit =
        lowerStr.includes('429') ||
        lowerStr.includes('quota') ||
        lowerStr.includes('rate limit') ||
        lowerStr.includes('rate_limit') ||
        lowerStr.includes('resource_exhausted') ||
        lowerStr.includes('generativelanguage.googleapis.com')

    if (isRateLimit && !finalResult.includes('Rate limit or quota exhausted from LLM provider')) {
        return rateLimitNotice + finalResult
    }

    const isDecemberCredits =
        lowerStr.includes('december wallet') ||
        lowerStr.includes('trydecember.com') ||
        lowerStr.includes('december cloud')

    const isOpenRouterCredits =
        !isDecemberCredits &&
        (lowerStr.includes('openrouter') ||
            lowerStr.includes('requires more credits') ||
            lowerStr.includes('can only afford'))

    if (
        isOpenRouterCredits &&
        (lowerStr.includes('credits') || lowerStr.includes('afford') || lowerStr.includes('402')) &&
        !finalResult.includes('OpenRouter credits exhausted or insufficient') &&
        !finalResult.includes('https://openrouter.ai/settings/credits')
    ) {
        const openRouterCreditsNotice =
            'OpenRouter credits exhausted or insufficient. Please add credits at https://openrouter.ai/settings/credits\n'
        return openRouterCreditsNotice + finalResult
    }

    return finalResult
}
