import { describe, it, expect } from 'bun:test'

import { SkillSchema } from '../../src/modules/skills/skills.schema'

describe('Skills Schema - Unit Tests', () => {
    describe('SkillSchema', () => {
        it('should pass with valid name and description', () => {
            const valid = {
                name: 'code-review',
                description: 'Automated code reviewer',
            }
            const res = SkillSchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.name).toBe('code-review')
                expect(res.data.description).toBe('Automated code reviewer')
            }
        })

        it('should fail with empty or missing name or description', () => {
            expect(SkillSchema.safeParse({ name: '', description: 'desc' }).success).toBe(false)
            expect(SkillSchema.safeParse({ name: 'name', description: '' }).success).toBe(false)
            expect(SkillSchema.safeParse({ name: 'name' }).success).toBe(false)
            expect(SkillSchema.safeParse({ description: 'desc' }).success).toBe(false)
        })
    })
})
