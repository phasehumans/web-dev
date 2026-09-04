import { describe, expect, test } from 'bun:test'

import { formatSkillsCatalog } from '../../src/skills/formatter'

import type { DiscoveredSkill } from '../../src/skills/types'

describe('Skills Formatter (Unit)', () => {
    test('returns empty string when no skills are provided', () => {
        expect(formatSkillsCatalog([])).toBe('')
    })

    test('formats compact alphabetized catalog with XML delimiters and prompt caching instructions', () => {
        const skills: DiscoveredSkill[] = [
            {
                name: 'docker-deploy',
                metadata: {
                    name: 'docker-deploy',
                    description: 'Prepares multi-container deployments.',
                    argumentHint: '[dev|prod]',
                },
                directoryPath: '/workspace/.december/skills/docker-deploy',
                entryFilePath: '/workspace/.december/skills/docker-deploy/SKILL.md',
                origin: 'workspace',
                scripts: [],
                references: [],
            },
            {
                name: 'ponytail',
                metadata: {
                    name: 'ponytail',
                    description: 'Forces the laziest solution that works.',
                },
                directoryPath: '/workspace/.agents/skills/ponytail',
                entryFilePath: '/workspace/.agents/skills/ponytail/SKILL.md',
                origin: 'workspace',
                scripts: [],
                references: [],
            },
        ]

        const formatted = formatSkillsCatalog(skills)

        expect(formatted).toContain('<skills>')
        expect(formatted).toContain('</skills>')
        expect(formatted).toContain('Available skills:')
        expect(formatted).toContain(
            '- docker-deploy (/workspace/.december/skills/docker-deploy/SKILL.md): Prepares multi-container deployments.'
        )
        expect(formatted).toContain(
            '- ponytail (/workspace/.agents/skills/ponytail/SKILL.md): Forces the laziest solution that works.'
        )
    })
})
