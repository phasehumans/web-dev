import { describe, it, expect } from 'bun:test'

import { sanitizeMarkdown } from '../../src/modules/setting/setting.utils'

describe('Setting Utils - Unit Tests', () => {
    describe('sanitizeMarkdown', () => {
        it('should replace single and multiple newlines with spaces', () => {
            expect(sanitizeMarkdown('line1\nline2\r\nline3')).toBe('line1 line2 line3')
        })

        it('should escape special markdown characters', () => {
            const input =
                'Hello *world* `code` [link](url) #heading +item -bullet .dot !bang {braces} _under_ \\slash'
            const result = sanitizeMarkdown(input)

            expect(result).toBe(
                'Hello \\*world\\* \\`code\\` \\[link\\]\\(url\\) \\#heading \\+item \\-bullet \\.dot \\!bang \\{braces\\} \\_under\\_ \\\\slash'
            )
        })

        it('should handle plain text without special characters unchanged', () => {
            expect(sanitizeMarkdown('Simple text with 123')).toBe('Simple text with 123')
        })
    })
})
