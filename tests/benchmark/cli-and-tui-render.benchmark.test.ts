import { THEME } from '@december/tui'
import { describe, expect, it } from 'bun:test'

import { parseCliArgs } from '../../apps/cli/src/args'

describe('CLI & TUI Rendering Subsystem Benchmarks', () => {
    it('benchmarks CLI argument parsing across diverse permutations over 50,000 cycles', () => {
        const argMatrix = [
            ['-m', 'claude-3-7-sonnet-latest', '-p', 'anthropic', '-y', 'build the login page'],
            ['-h'],
            ['-v'],
            ['--json', '--session-id', 'sess-benchmark-1', 'analyze performance'],
            ['login'],
            ['logout'],
            ['init'],
        ]

        const start = performance.now()
        for (let i = 0; i < 50000; i++) {
            const argv = argMatrix[i % argMatrix.length]
            const parsed = parseCliArgs(argv)
            if (i === 0) {
                expect(parsed.model).toBe('claude-3-7-sonnet-latest')
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(300) // 50,000 parses in under 300ms
    })

    it('benchmarks theme token resolution and glyph lookups over 100,000 accesses', () => {
        const start = performance.now()
        let sum = 0
        for (let i = 0; i < 100000; i++) {
            const brand = THEME.colors.brand
            const promptGlyph = THEME.glyphs.prompt
            const pad = THEME.padding.paddingX
            sum += brand.length + promptGlyph.length + pad
        }
        const duration = performance.now() - start

        expect(sum).toBeGreaterThan(0)
        expect(duration).toBeLessThan(50) // 100,000 token reads in under 50ms
    })
})
