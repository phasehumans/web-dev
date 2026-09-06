import { expect, test, describe } from 'bun:test'

import { parseErrorMessage } from '../src/utils/error-parser'

describe('error-parser', () => {
    test('extracts simple error string', () => {
        expect(parseErrorMessage('Simple error')).toBe('Simple error')
    })

    test('extracts error from standard Error object', () => {
        expect(parseErrorMessage(new Error('Standard error'))).toBe('Standard error')
    })

    test('extracts message from JSON string', () => {
        expect(parseErrorMessage('{"message": "JSON error"}')).toBe('JSON error')
        expect(parseErrorMessage('{"error": "JSON error"}')).toBe('JSON error')
        expect(parseErrorMessage('{"error": {"message": "Nested JSON error"}}')).toBe(
            'Nested JSON error'
        )
    })

    test('extracts message from complex JSON string', () => {
        const complexStr = 'Some text before {"error": {"message": "Extracted error"}} text after'
        expect(parseErrorMessage(complexStr)).toBe('Extracted error')
    })

    test('extracts from double nested JSON string', () => {
        expect(
            parseErrorMessage('{"error": "{\\"message\\": \\"Double nested JSON error\\"}"}')
        ).toBe('Double nested JSON error')
    })

    test('extracts from regex when JSON is malformed', () => {
        const malformed = 'Oops! {"message": "Malformed JSON error"' // missing closing brace
        expect(parseErrorMessage(malformed)).toBe('Malformed JSON error')
    })

    test('regex extraction handles exceptions', () => {
        // Line 21-22: exception in JSON.parse of regex match
        const malformedRegexMatch = '{"message": "broken\\"escape"}'
        expect(parseErrorMessage(malformedRegexMatch)).toBe('broken"escape')
    })

    test('recursively parses json error fields', () => {
        // Line 36-37: deeply nested json inside error/message fields
        expect(parseErrorMessage('{"message": "{\\"error\\": {\\"message\\": \\"deep\\"}}"}')).toBe(
            'deep'
        )

        expect(parseErrorMessage('{"error": "{\\"message\\": \\"deep error\\"}"}')).toBe(
            'deep error'
        )
    })

    test('extracts from json block', () => {
        // Line 51-57: fallback json block extraction
        const blockStr = 'prefix {"error": {"message": "block error"}} suffix'
        expect(parseErrorMessage(blockStr)).toBe('block error')

        const blockStr2 = 'prefix {"message": "block message"} suffix'
        expect(parseErrorMessage(blockStr2)).toBe('block message')
    })

    test('falls back to util.inspect for complex objects without message', () => {
        const obj = { foo: 'bar', baz: 42 }
        const parsed = parseErrorMessage(obj)
        expect(parsed).toContain("foo: 'bar'")
        expect(parsed).toContain('baz: 42')
    })

    test('cleans up [Error] prefixes', () => {
        expect(parseErrorMessage('[ModuleError]: Real error message')).toBe('Real error message')
    })

    test('handles null or undefined gracefully', () => {
        expect(parseErrorMessage(null)).toBe('null')
        expect(parseErrorMessage(undefined)).toBe('undefined')
    })

    test('stringifies non-string error messages', () => {
        // Line 7: JSON.stringify(errMsg)
        const customErr = {
            message: { something: 'weird' },
        }
        expect(parseErrorMessage(customErr)).toContain('{"something":"weird"}')
    })

    test('handles top-level catch gracefully', () => {
        // Line 9: return 'Unknown error occurred.'
        const badObj = Object.create(null)
        Object.defineProperty(badObj, 'message', {
            get() {
                throw new Error('Cannot read')
            },
        })
        expect(parseErrorMessage(badObj)).toBe('Unknown error occurred.')
    })

    test('preserves CTA links in error messages', () => {
        const ctaErr =
            'Insufficient credits in December Wallet. Please add credits at https://trydecember.com/settings/billing or configure Bring Your Own Key (BYOK) via `/login` to continue using December.'
        expect(parseErrorMessage(ctaErr)).toBe(ctaErr)
    })

    test('does not attach OpenRouter notice to December Wallet 402 error', () => {
        const decemberWallet402 =
            '402 Insufficient credits in December Wallet. Please add credits at https://trydecember.com/settings/billing or configure Bring Your Own Key (BYOK) via `/login` to continue using December.\n402 status code (no body)'
        const parsed = parseErrorMessage(decemberWallet402)
        expect(parsed).not.toContain('OpenRouter credits exhausted or insufficient')
        expect(parsed).not.toContain('https://openrouter.ai/settings/credits')
        expect(parsed).toContain('Insufficient credits in December Wallet')
        expect(parsed).toContain('https://trydecember.com/settings/billing')
        expect(parsed).toContain('Bring Your Own Key (BYOK)')
    })

    test('attaches custom December rate limit notice when rate limit/quota is exhausted', () => {
        const rawQuotaErr =
            'You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash'
        const parsed = parseErrorMessage(rawQuotaErr)
        expect(parsed).toContain(
            'Rate limit or quota exhausted from LLM provider. Please upgrade your API key tier with your provider (OpenAI, Anthropic, Gemini) or switch to December Cloud Subscription at https://trydecember.com/pricing'
        )
        expect(parsed).toContain('generativelanguage.googleapis.com')
    })

    test('attaches OpenRouter credit notice when 402 or credit limit is exhausted', () => {
        const raw402Err =
            '402 This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 10666. To increase, visit https://openrouter.ai/settings/credits and upgrade to a paid account'
        const parsed = parseErrorMessage(raw402Err)
        expect(parsed).toContain('https://openrouter.ai/settings/credits')
        expect(parsed).toContain('can only afford 10666')
        expect(parsed).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    })

    test('attaches Arcee credit notice when 402 or credit limit is exhausted on Arcee', () => {
        const raw402Err = '402 Insufficient credits. Arcee model trinity-large-thinking'
        const parsed = parseErrorMessage(raw402Err)
        expect(parsed).toContain('https://platform.arcee.ai/api/api-keys')
        expect(parsed).toContain('Insufficient credits in your Arcee AI account')
        expect(parsed).not.toContain('December Wallet')
    })

    test('attaches authentication notice when 401 or session expired error occurs', () => {
        const raw401Err = '401 status code (no body)'
        const parsed = parseErrorMessage(raw401Err)
        expect(parsed).toContain('Authentication failed or session expired')
        expect(parsed).toContain('/login')
        expect(parsed).toContain('Bring Your Own Key (BYOK)')
    })
})
