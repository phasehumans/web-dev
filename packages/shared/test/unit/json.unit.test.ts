import { describe, expect, test } from 'bun:test'

import { safeParseJson } from '../../src/utils/json'

describe('safeParseJson (Unit)', () => {
    test('returns empty object for empty or whitespace string', () => {
        expect(safeParseJson('')).toEqual({})
        expect(safeParseJson('   ')).toEqual({})
    })

    test('parses clean valid JSON string', () => {
        const result = safeParseJson('{"name":"december","active":true}')
        expect(result).toEqual({ name: 'december', active: true })
    })

    test('strips markdown code blocks before parsing', () => {
        const markdownJson = '```json\n{"key": "value"}\n```'
        const result = safeParseJson(markdownJson)
        expect(result).toEqual({ key: 'value' })
    })

    test('auto-heals unclosed JSON brace', () => {
        const unclosedJson = '{"key": "value"'
        const result = safeParseJson(unclosedJson)
        expect(result).toEqual({ key: 'value' })
    })

    test('auto-heals trailing commas in object', () => {
        const trailingCommaJson = '{"key": "value",}'
        const result = safeParseJson(trailingCommaJson)
        expect(result).toEqual({ key: 'value' })
    })

    test('throws descriptive error on invalid unparseable text', () => {
        expect(() => {
            safeParseJson('invalid json string')
        }).toThrow('Failed to parse JSON tool arguments')
    })

    test('throws actionable truncation error when string is unterminated due to token limit', () => {
        const truncatedJson = '{"filePath": "/code/index.html", "content": "<div>incomplete'
        expect(() => {
            safeParseJson(truncatedJson)
        }).toThrow('Tool arguments JSON was truncated mid-generation')
    })
})
