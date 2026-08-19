import { describe, expect, it } from 'bun:test'

import { parseCliArgs, getHelpText } from '../../src/args'

describe('CLI Args Parser (Unit)', () => {
    it('parses help and version flags', () => {
        expect(parseCliArgs(['-h']).isHelp).toBe(true)
        expect(parseCliArgs(['--help']).isHelp).toBe(true)
        expect(parseCliArgs(['-v']).isVersion).toBe(true)
        expect(parseCliArgs(['--version']).isVersion).toBe(true)
    })

    it('parses model, provider, and non-interactive yes flags', () => {
        const parsed = parseCliArgs([
            '-m',
            'gemini-3.7-flash',
            '-p',
            'google',
            '-y',
            'refactor authentication',
        ])
        expect(parsed.model).toBe('gemini-3.7-flash')
        expect(parsed.provider).toBe('google')
        expect(parsed.yes).toBe(true)
        expect(parsed.prompt).toBe('refactor authentication')
    })

    it('parses standalone subcommands', () => {
        expect(parseCliArgs(['login']).command).toBe('login')
        expect(parseCliArgs(['logout']).command).toBe('logout')
        expect(parseCliArgs(['init']).command).toBe('init')
    })

    it('parses --scope and --cwd flags', () => {
        const parsed = parseCliArgs(['--scope', 'packages/agent', '--cwd', '/tmp'])
        expect(parsed.scope).toBe('packages/agent')
        expect(parsed.cwd).toBe('/tmp')
    })

    it('formats help text containing version number', () => {
        const help = getHelpText('0.3.9')
        expect(help).toContain('December CLI v0.3.9')
        expect(help).toContain('december init')
        expect(help).toContain('december login')
    })
})
