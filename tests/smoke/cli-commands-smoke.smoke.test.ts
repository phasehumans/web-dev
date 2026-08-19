import { describe, expect, it } from 'bun:test'

import { parseCliArgs, getHelpText } from '../../apps/cli/src/args'
import { loadConfig, getAuthStatus } from '../../apps/cli/src/config'
import { FileSessionRepository } from '../../apps/cli/src/file-session-repository'

describe('CLI Commands & Subsystems Monorepo Smoke Tests', () => {
    it('parses all primary CLI options and flags', () => {
        const fullArgv = [
            '-m',
            'claude-3-7-sonnet-latest',
            '-p',
            'anthropic',
            '-y',
            '--json',
            '--session-id',
            'smoke-sess-99',
            'create',
            'endpoint',
        ]

        const parsed = parseCliArgs(fullArgv)
        expect(parsed.model).toBe('claude-3-7-sonnet-latest')
        expect(parsed.provider).toBe('anthropic')
        expect(parsed.yes).toBe(true)
        expect(parsed.json).toBe(true)
        expect(parsed.sessionId).toBe('smoke-sess-99')
        expect(parsed.prompt).toBe('create endpoint')
    })

    it('generates formatted help documentation', () => {
        const help = getHelpText('0.3.9')
        expect(help).toContain('December CLI v0.3.9')
        expect(help).toContain('Launch interactive TUI session')
        expect(help).toContain('Execute headless agent task')
    })

    it('loads configuration and retrieves auth status', async () => {
        const config = await loadConfig()
        expect(config).toBeDefined()
        expect(config.providers).toBeDefined()

        const authStatus = await getAuthStatus()
        expect(authStatus).toBeDefined()
        expect(typeof authStatus.hasByok).toBe('boolean')
    })

    it('instantiates FileSessionRepository instance', () => {
        const repo = new FileSessionRepository()
        expect(repo).toBeDefined()
        expect(typeof repo.loadContext).toBe('function')
        expect(typeof repo.saveContext).toBe('function')
    })
})
