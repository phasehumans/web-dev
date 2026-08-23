import { describe, it, expect } from 'bun:test'

import { WebhookQuerySchema } from '../../src/modules/githubapp/githubapp.schema'

describe('GitHubApp Schema - Unit Tests', () => {
    describe('WebhookQuerySchema', () => {
        it('should pass with valid optional installationId', () => {
            const valid = { installationId: '123456' }
            const res = WebhookQuerySchema.safeParse(valid)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data.installationId).toBe('123456')
            }
        })

        it('should pass with empty query object (installationId omitted)', () => {
            const res = WebhookQuerySchema.safeParse({})
            expect(res.success).toBe(true)
        })
    })
})
