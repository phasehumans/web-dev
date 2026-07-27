import { describe, it, expect } from 'bun:test'

import { parseCliArgs, getHelpText } from '../src/args'

describe('parseCliArgs', () => {
    it('parses --help and -h flags', () => {
        expect(parseCliArgs(['--help']).isHelp).toBe(true)
        expect(parseCliArgs(['-h']).isHelp).toBe(true)
    })

    it('parses --version and -v flags', () => {
        expect(parseCliArgs(['--version']).isVersion).toBe(true)
        expect(parseCliArgs(['-v']).isVersion).toBe(true)
    })

    it('parses positional prompts and flags', () => {
        const parsed = parseCliArgs([
            'fix',
            'the',
            'bug',
            '--yes',
            '--model',
            'gpt-4o',
            '--provider',
            'openai',
            '--session-id',
            's-123',
        ])
        expect(parsed.prompt).toBe('fix the bug')
        expect(parsed.yes).toBe(true)
        expect(parsed.model).toBe('gpt-4o')
        expect(parsed.provider).toBe('openai')
        expect(parsed.sessionId).toBe('s-123')
        expect(parsed.command).toBeUndefined()
    })

    it('identifies known commands like handoff and login', () => {
        expect(parseCliArgs(['login']).command).toBe('login')
        expect(parseCliArgs(['handoff']).command).toBe('handoff')
    })

    it('returns formatted help text', () => {
        const help = getHelpText('0.2.20')
        expect(help).toContain('Usage:')
        expect(help).toContain('december')
        expect(help).toContain('--help')
        expect(help).toContain('--version')
    })
})
