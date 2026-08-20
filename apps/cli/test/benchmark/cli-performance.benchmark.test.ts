import { describe, expect, it } from 'bun:test'

import { parseCliArgs } from '../../src/args'

describe('CLI Performance & Argument Parsing Benchmarks', () => {
    it('benchmarks CLI argument parsing on 20,000 invocations', () => {
        const testArgv = [
            '-m',
            'claude-3-7-sonnet-latest',
            '-p',
            'anthropic',
            '-y',
            '--session-id',
            'bench-session-123',
            'run',
            'extensive',
            'tests',
        ]

        const start = performance.now()
        for (let i = 0; i < 20000; i++) {
            parseCliArgs(testArgv)
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(200) // 20,000 parses in under 200ms
    })
})
