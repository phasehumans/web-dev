import { describe, it, expect } from 'bun:test'

import { HandlePromptSchema } from '../../src/modules/core/core.schema'

describe('Core Schema - Extensive Unit Tests', () => {
    describe('HandlePromptSchema', () => {
        it('should pass with valid prompt string', () => {
            const result = HandlePromptSchema.safeParse({
                prompt: 'Hello AI',
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.prompt).toBe('Hello AI')
            }
        })

        it('should pass with prompt, projectId, and sessionId', () => {
            const result = HandlePromptSchema.safeParse({
                prompt: 'Build a feature',
                projectId: 'proj-123',
                sessionId: 'sess-456',
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.prompt).toBe('Build a feature')
                expect(result.data.projectId).toBe('proj-123')
                expect(result.data.sessionId).toBe('sess-456')
            }
        })

        it('should pass with large prompt text', () => {
            const largePrompt = 'a'.repeat(5000)
            const result = HandlePromptSchema.safeParse({
                prompt: largePrompt,
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.prompt.length).toBe(5000)
            }
        })

        it('should fail with empty prompt string', () => {
            const result = HandlePromptSchema.safeParse({
                prompt: '',
            })
            expect(result.success).toBe(false)
        })

        it('should fail if prompt field is missing', () => {
            const result = HandlePromptSchema.safeParse({
                projectId: 'proj-123',
            })
            expect(result.success).toBe(false)
        })

        it('should fail if prompt is not a string (number/boolean/object)', () => {
            expect(HandlePromptSchema.safeParse({ prompt: 12345 }).success).toBe(false)
            expect(HandlePromptSchema.safeParse({ prompt: true }).success).toBe(false)
            expect(HandlePromptSchema.safeParse({ prompt: { key: 'value' } }).success).toBe(false)
        })

        it('should fail if projectId or sessionId is not a string', () => {
            expect(HandlePromptSchema.safeParse({ prompt: 'test', projectId: 123 }).success).toBe(
                false
            )
            expect(HandlePromptSchema.safeParse({ prompt: 'test', sessionId: true }).success).toBe(
                false
            )
        })

        it('should ignore unexpected extra properties in request payload', () => {
            const result = HandlePromptSchema.safeParse({
                prompt: 'Valid prompt',
                extraField: 'should be stripped or ignored',
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect((result.data as any).extraField).toBeUndefined()
            }
        })
    })
})
