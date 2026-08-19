import { describe, it, expect } from 'bun:test'

import { THEME, COLORS } from '../../src/theme'

describe('THEME Contract (Unit)', () => {
    it('exports required semantic color tokens', () => {
        expect(THEME.colors.brand).toBe('#89B4F8')
        expect(THEME.colors.text).toBe('white')
        expect(THEME.colors.muted).toBe('#AAAAAA')
        expect(THEME.colors.dim).toBe('#666666')
        expect(THEME.colors.border).toBe('#333333')
        expect(THEME.colors.success).toBe('#6EE7B7')
        expect(THEME.colors.error).toBe('#FCA5A5')
        expect(THEME.colors.warning).toBe('#FDD663')
    })

    it('exports standardized horizontal padding token', () => {
        expect(THEME.padding.paddingX).toBe(2)
    })

    it('exports unified glyph definitions', () => {
        expect(THEME.glyphs.prompt).toBe('❭')
        expect(THEME.glyphs.selector).toBe('❭')
        expect(THEME.glyphs.bullet).toBe('•')
        expect(THEME.glyphs.status).toBe('●')
    })

    it('provides backwards-compatible COLORS object mapped to semantic colors', () => {
        expect(COLORS.brand).toBe('#89B4F8')
        expect(COLORS.success).toBe('#6EE7B7')
        expect(COLORS.error).toBe('#FCA5A5')
        expect(COLORS.border).toBe('#333333')
    })
})
