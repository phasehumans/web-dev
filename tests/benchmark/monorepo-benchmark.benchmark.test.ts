import { trimToolSchema, getAdaptiveThinkingLevel } from '@december/agent'
import { getModelContextWindow } from '@december/providers'
import { ReadFileTool } from '@december/tools'
import { describe, expect, it } from 'bun:test'

import { parseCliArgs } from '../../apps/cli/src/args'

describe('Monorepo Cross-Package Benchmark Tests', () => {
    it('benchmarks full cross-package metadata pipeline throughput over 10,000 cycles', () => {
        const cliArgs = ['-m', 'gemini-3.7-flash', '-p', 'google', '-y', 'refactor all models']

        const start = performance.now()
        for (let i = 0; i < 10000; i++) {
            // CLI arg parsing
            const parsed = parseCliArgs(cliArgs)

            // Model context lookup
            const contextSize = getModelContextWindow(parsed.model || 'gemini-3.7-flash')

            // Adaptive thinking calculation
            const level = getAdaptiveThinkingLevel([
                { role: 'user', content: parsed.prompt || 'refactor all models' },
            ])

            // Tool schema trimming
            const trimmed = trimToolSchema(ReadFileTool.inputSchema as any)

            if (i === 0) {
                expect(contextSize).toBe(1_000_000)
                expect(level).toBe('high')
                expect(trimmed).toBeDefined()
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(300) // 10,000 full pipeline cycles in under 300ms
    })
})
