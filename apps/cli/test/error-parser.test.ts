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
            'Insufficient credits in December Wallet. Please add credits at https://trydecember.com/settings/billing to continue using December Cloud.'
        expect(parseErrorMessage(ctaErr)).toBe(ctaErr)
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
})
