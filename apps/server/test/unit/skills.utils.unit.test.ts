import { describe, it, expect } from 'bun:test'

import { formatSkillName } from '../../src/modules/skills/skills.utils'

describe('Skills Utils - Unit Tests', () => {
    describe('formatSkillName', () => {
        it('should lowercase and replace spaces with hyphens', () => {
            expect(formatSkillName('Code Review')).toBe('code-review')
            expect(formatSkillName('Deep Search Assistant')).toBe('deep-search-assistant')
            expect(formatSkillName('single')).toBe('single')
        })
    })
})
