import { describe, expect, it } from 'bun:test'

import { parseCliArgs, getHelpText } from '../src/args'

describe('CLI Startup & Fast-Path Flag Performance', () => {
    it('executes parseCliArgs for help flag in sub-millisecond time', () => {
        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            const parsed = parseCliArgs(['--help'])
            expect(parsed.isHelp).toBe(true)
        }
        const elapsed = performance.now() - start
        // 1000 parsing operations should take under 50ms (average < 0.05ms each)
        expect(elapsed).toBeLessThan(50)
    })

    it('executes parseCliArgs for version flag in sub-millisecond time', () => {
        const start = performance.now()
        for (let i = 0; i < 1000; i++) {
            const parsed = parseCliArgs(['-v'])
            expect(parsed.isVersion).toBe(true)
        }
        const elapsed = performance.now() - start
        expect(elapsed).toBeLessThan(50)
    })

    it('generates getHelpText without throwing and includes usage commands', () => {
        const help = getHelpText('1.0.0')
        expect(help).toContain('December CLI v1.0.0')
        expect(help).toContain('december login')
        expect(help).toContain('december init')
        expect(help).toContain('december update')
        expect(help).toContain('--help')
        expect(help).toContain('--version')
    })
})
