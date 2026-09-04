import { describe, expect, test } from 'bun:test'

import { interpolateSkillPrompt } from '../../src/skills/interpolate'

describe('Skill Prompt Interpolation (Unit)', () => {
    test('interpolates placeholders like $FILE, $PKG, $ARG, $@, $*', () => {
        expect(
            interpolateSkillPrompt('test-skill', 'Run tests for $PKG', ['packages/agent'])
        ).toContain('Run tests for packages/agent')

        expect(
            interpolateSkillPrompt('test-skill', 'Fix lint in $FILE', ['src/index.ts'])
        ).toContain('Fix lint in src/index.ts')

        expect(
            interpolateSkillPrompt('test-skill', 'Process $1 and $2', ['first', 'second'])
        ).toContain('Process first and second')

        expect(
            interpolateSkillPrompt('test-skill', 'Deploy with args: $@', ['--dry-run', '--verbose'])
        ).toContain('Deploy with args: --dry-run --verbose')
    })

    test('structures skill prompt header when arguments are provided', () => {
        const result = interpolateSkillPrompt('tdd', 'Follow red-green-refactor loop.', [
            'auth-service',
        ])
        expect(result).toContain('[Skill Invocation: /tdd auth-service]')
        expect(result).toContain("Please follow the procedures from skill 'tdd':")
        expect(result).toContain('Follow red-green-refactor loop.')
    })

    test('structures skill prompt header without arguments when none are provided', () => {
        const result = interpolateSkillPrompt('tdd', 'Follow red-green-refactor loop.', [])
        expect(result).toContain('[Skill Invocation: /tdd]')
        expect(result).toContain("Please follow the procedures from skill 'tdd':")
        expect(result).toContain('Follow red-green-refactor loop.')
    })
})
