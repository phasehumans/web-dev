import { describe, expect, it } from 'bun:test'

import { parseCliArgs, getHelpText } from '../../src/args'
import { loadConfig } from '../../src/config'
import { FileSessionRepository } from '../../src/file-session-repository'

describe('CLI Subsystem Smoke Tests', () => {
    it('verifies CLI helper functions, argument parser, configuration loader, and session repository boot cleanly', async () => {
        const parsed = parseCliArgs(['--version'])
        expect(parsed.isVersion).toBe(true)

        const help = getHelpText('0.3.9')
        expect(help).toContain('0.3.9')

        const config = await loadConfig()
        expect(config).toBeDefined()

        const repo = new FileSessionRepository()
        expect(repo).toBeDefined()
    })
})
